// Civ7's script host has no native WebAssembly
import { WebAssembly as PolywasmAPI } from 'polywasm';
// Civ7's script host lacks TextEncoder/TextDecoder. Self-installs only if missing
import 'fastestsmallesttextencoderdecoder/EncoderDecoderTogether.min.js';
// Civ7's script host also lacks `crypto`. Self-installs only if missing
import 'polyfill-crypto-methods';

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
 * Loads a wasm-bindgen (`--target no-modules`) module: loads its glue as a
 * real `<script src>` (needed for `document.currentScript.src` to resolve),
 * then fetches the `.wasm` bytes and initializes it.
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

console.log('[c7emr] WASM module loaded');
