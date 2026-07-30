import { WebAssembly as PolywasmAPI } from 'polywasm';

// Civ7's script host has no native WebAssembly. Only install the polyfill if
// one isn't already present, in case that ever changes.
if (typeof globalThis.WebAssembly === 'undefined') {
    globalThis.WebAssembly = PolywasmAPI;
}

/**
 * Decodes a base64 string into raw bytes without relying on `atob` (which
 * Civ7's script host doesn't have). Useful for content mods that want to
 * inline a small `.wasm` module directly rather than ship it as a separate
 * file fetched via `fetchBytes`.
 *
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToBytes(base64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
    }

    const len = base64.length;
    let bufferLength = base64.length * 0.75;
    if (base64.charAt(len - 1) === '=') {
        bufferLength--;
        if (base64.charAt(len - 2) === '=') {
            bufferLength--;
        }
    }

    const bytes = new Uint8Array(bufferLength);
    let p = 0;
    for (let i = 0; i < base64.length; i += 4) {
        const e1 = lookup[base64.charCodeAt(i)];
        const e2 = lookup[base64.charCodeAt(i + 1)];
        const e3 = lookup[base64.charCodeAt(i + 2)];
        const e4 = lookup[base64.charCodeAt(i + 3)];
        bytes[p++] = (e1 << 2) | (e2 >> 4);
        if (p < bytes.length) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
        if (p < bytes.length) bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
    }
    return bytes;
}

/**
 * Fetches raw bytes from a `fs://` mod path (or any XHR-reachable URL).
 * Civ7's script host has XMLHttpRequest but not `fetch()`.
 *
 * @param {string} url
 * @param {(bytes: Uint8Array) => void} onLoad
 * @param {(error: Error) => void} onError
 */
function fetchBytes(url, onLoad, onError) {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function () {
            if (xhr.status !== 0 && xhr.status !== 200) {
                onError(new Error(`C7EMR: HTTP status ${xhr.status} fetching ${url}`));
                return;
            }
            onLoad(new Uint8Array(xhr.response));
        };
        xhr.onerror = function () {
            onError(new Error(`C7EMR: XHR error fetching ${url}`));
        };
        xhr.send();
    } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
    }
}

globalThis.C7EMR = Object.assign(globalThis.C7EMR || {}, {
    fetchBytes,
    base64ToBytes,
});

console.warn(
    `[c7emr-wasm] loaded at ${Date.now()}; WebAssembly=${typeof globalThis.WebAssembly} TextDecoder=${typeof globalThis.TextDecoder} TextEncoder=${typeof globalThis.TextEncoder}`
);

// Diagnostic: ask the engine directly what order it thinks scripts are in,
// to check whether <Dependencies> actually orders the request list.
if (typeof Modding !== 'undefined' && typeof InitialScriptType !== 'undefined') {
    try {
        const scripts = Modding.getInitialScripts(InitialScriptType.Default);
        const urls = scripts.map((s) => s.url);
        const wasmIndex = urls.findIndex((u) => u.includes('c7emr-wasm.js'));
        const helloIndex = urls.findIndex((u) => u.includes('c7emr_hello_wasm.js'));
        console.warn(
            `[c7emr-wasm] total=${urls.length} c7emr-wasm.js@${wasmIndex} c7emr_hello_wasm.js@${helloIndex}`
        );
    } catch (e) {
        console.warn(`[c7emr-wasm] could not read initial scripts: ${e instanceof Error ? e.message : e}`);
    }
} else {
    console.warn(
        `[c7emr-wasm] Modding/InitialScriptType not reachable here: Modding=${typeof Modding} InitialScriptType=${typeof InitialScriptType}`
    );
}
