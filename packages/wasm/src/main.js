import { WebAssembly as PolywasmAPI } from 'polywasm';
// The package's default entry point (`module`/`main` fields) is a Node-oriented
// build with unguarded `Buffer` access that crashes in a browser-like sandbox
// with neither `Buffer` nor native TextEncoder/TextDecoder. The `browser` field
// entry has none of that - pure Uint8Array based, self-installs onto the global
// object, and already guards for an existing native implementation.
import 'fastestsmallesttextencoderdecoder/EncoderDecoderTogether.min.js';

// Civ7's script host has no native WebAssembly. Only install the polyfill if
// one isn't already present, in case that ever changes.
if (typeof globalThis.WebAssembly === 'undefined') {
    globalThis.WebAssembly = PolywasmAPI;
}

/**
 * @param {string} path
 * @param {XMLHttpRequestResponseType} responseType
 * @param {(result: any) => void} onLoad
 * @param {(error: Error) => void} onError
 */
function fetchGameFile(path, responseType, onLoad, onError) {
    const url = `fs://game/${path}`;
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = responseType;
        xhr.onload = function () {
            if (xhr.status !== 0 && xhr.status !== 200) {
                onError(new Error(`C7EMR: HTTP status ${xhr.status} fetching ${url}`));
                return;
            }
            onLoad(xhr.response);
        };
        xhr.onerror = function () {
            onError(new Error(`C7EMR: XHR error fetching ${url}`));
        };
        xhr.send();
    } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
    }
}

/**
 * @param {string} path
 * @param {(bytes: Uint8Array) => void} onLoad
 * @param {(error: Error) => void} onError
 */
function fetchBytes(path, onLoad, onError) {
    fetchGameFile(path, 'arraybuffer', (buf) => onLoad(new Uint8Array(buf)), onError);
}

/**
 * @param {string} path
 * @param {(text: string) => void} onLoad
 * @param {(error: Error) => void} onError
 */
function fetchText(path, onLoad, onError) {
    fetchGameFile(path, 'text', onLoad, onError);
}

/**
 * Loads a wasm-bindgen (`--target no-modules`) module: loads its glue (same
 * path with `_bg.wasm` replaced by `.js` - wasm-bindgen's own default layout)
 * as a real `src`-based <script> element (not eval - eval's `let`/`const`
 * bindings don't survive past the eval call, but a real script tag's do; and
 * not an inline injected script either - the glue reads `document.
 * currentScript.src` and Civ7 throws trying to parse an empty one, so it
 * needs a real `src` to resolve against), then fetches the `.wasm` bytes and
 * initializes it. Because the glue's own top-level code only runs once this
 * is actually called - well after WebAssembly/TextEncoder/TextDecoder are
 * already installed above - this never races the way loading it as a plain
 * <UIScripts> item would.
 *
 * @param {string} path path to the `_bg.wasm` file, e.g. "my-mod/ui/my_crate_bg.wasm"
 * @returns {Promise<void>}
 */
function loadWasm(path) {
    const gluePath = path.replace(/_bg\.wasm$/, '.js');
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `fs://game/${gluePath}`;
        script.onload = function () {
            fetchBytes(
                path,
                (bytes) => {
                    try {
                        wasm_bindgen.initSync({ module: bytes });
                        resolve();
                    } catch (e) {
                        reject(e instanceof Error ? e : new Error(String(e)));
                    }
                },
                reject
            );
        };
        script.onerror = function () {
            reject(new Error(`C7EMR: failed to load script ${script.src}`));
        };
        (document.head || document.body || document.documentElement).appendChild(script);
    });
}

globalThis.C7EMR = Object.assign(globalThis.C7EMR || {}, {
    fetchBytes,
    fetchText,
    loadWasm
});

console.warn(
    `[c7emr-wasm] loaded at ${Date.now()}; WebAssembly=${typeof globalThis.WebAssembly} TextDecoder=${typeof globalThis.TextDecoder} TextEncoder=${typeof globalThis.TextEncoder}`
);
