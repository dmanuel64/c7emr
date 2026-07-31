/**
 * Loads a plain classic script from this mod's own files and waits for it to run.
 * Brython must be loaded this way (a real, un-bundled <script> tag) rather than
 * through rollup/commonjs - it uses eval()/new Function() internally to compile
 * Python to JS, and that generated code only resolves Brython's own internals
 * (`$B`) correctly when Brython itself is running as a genuine top-level script.
 *
 * @param {string} path path relative to `fs://game/`, e.g. "ytm-c7emr-python/ui/brython.js"
 * @returns {Promise<void>}
 */
function loadScript(path) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `fs://game/${path}`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`C7EMR: failed to load script ${script.src}`));
        (document.head || document.body || document.documentElement).appendChild(script);
    });
}

/**
 * @param {string} path
 * @param {(text: string) => void} onLoad
 * @param {(error: Error) => void} onError
 */
function fetchPythonSource(path, onLoad, onError) {
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

let brythonReady = null;

/**
 * Loads brython.js + brython_stdlib.js (once) and runs Brython's own bootstrap,
 * without letting it scan the DOM for <script type="text/python"> tags - we
 * drive execution ourselves via `__BRYTHON__.run_script`.
 *
 * @returns {Promise<void>}
 */
function ensureBrythonReady() {
    if (!brythonReady) {
        brythonReady = loadScript('ytm-c7emr-python/ui/brython.js')
            .then(() => loadScript('ytm-c7emr-python/ui/brython_stdlib.js'))
            .then(() => {
                globalThis.brython({ ids: [] });
            });
    }
    return brythonReady;
}

let scriptCounter = 0;

/**
 * Loads and runs a Python script through Brython, sharing this mod's global VM state.
 *
 * @param {string} path path to the `.py` file, e.g. "my-mod/ui/my_script.py"
 * @returns {Promise<void>}
 */
function loadPython(path) {
    return ensureBrythonReady().then(
        () =>
            new Promise((resolve, reject) => {
                fetchPythonSource(
                    path,
                    (source) => {
                        try {
                            const url = `fs://game/${path}`;
                            const moduleName = `c7emr_${scriptCounter++}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
                            const scriptElement = document.createElement('script');
                            globalThis.__BRYTHON__.run_script(scriptElement, source, moduleName, url, true);
                            resolve();
                        } catch (e) {
                            if (e instanceof Error) {
                                reject(e);
                                return;
                            }
                            // Brython throws its own Python exception objects, not JS Errors.
                            // Brython already prints the full traceback to the console itself
                            // (via $B.show_error) before this runs - this is just a best-effort
                            // one-line summary for the rejected promise.
                            const detail = e && e.args && e.args.length ? e.args[0] : undefined;
                            reject(new Error(detail !== undefined ? String(detail) : 'Python script failed - see console for traceback'));
                        }
                    },
                    reject
                );
            })
    );
}

globalThis.C7EMR = Object.assign(globalThis.C7EMR || {}, {
    loadPython
});

console.log('[c7emr] Python module loaded');
