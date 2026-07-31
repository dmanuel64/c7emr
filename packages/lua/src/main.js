import * as fengariWeb from 'fengari-web';

/**
 * @param {string} path
 * @param {(text: string) => void} onLoad
 * @param {(error: Error) => void} onError
 */
function fetchLuaSource(path, onLoad, onError) {
    const url = `fs://game/${path}`;
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'text';
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
 * Loads and runs a Lua script through fengari, sharing this mod's global Lua state.
 *
 * @param {string} path path to the `.lua` file, e.g. "my-mod/ui/my_script.lua"
 * @returns {Promise<any>} resolves with whatever the Lua chunk returns
 */
function loadLua(path) {
    return new Promise((resolve, reject) => {
        fetchLuaSource(
            path,
            (source) => {
                try {
                    const chunk = fengariWeb.load(source, `@${path}`);
                    resolve(chunk());
                } catch (e) {
                    reject(e instanceof Error ? e : new Error(String(e)));
                }
            },
            reject
        );
    });
}

globalThis.C7EMR = Object.assign(globalThis.C7EMR || {}, {
    loadLua
});

console.log('[c7emr] Lua module loaded');
