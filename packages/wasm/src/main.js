import { WebAssembly as PolywasmAPI } from 'polywasm';

// Civ7's Coherent sandbox has no native WebAssembly. Only install the polyfill if
// one isn't already present, in case that ever changes.
if (typeof globalThis.WebAssembly === 'undefined') {
    globalThis.WebAssembly = PolywasmAPI;
}

/**
 * @param {string} path
 * @returns {Promise<Uint8Array>}
 */
function loadWasm(path) {
    const url = `fs://game/${path}`;
    return new Promise((resolve, reject) => {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function () {
                if (xhr.status !== 0 && xhr.status !== 200) {
                    reject(new Error(`C7EMR: HTTP status ${xhr.status} fetching ${url}`));
                    return;
                }
                resolve(new Uint8Array(xhr.response));
            };
            xhr.onerror = function () {
                reject(new Error(`C7EMR: XHR error fetching ${url}`));
            };
            xhr.send();
        } catch (e) {
            reject(e instanceof Error ? e : new Error(String(e)));
        }
    });
}

globalThis.C7EMR = Object.assign(globalThis.C7EMR || {}, {
    loadWasm
});