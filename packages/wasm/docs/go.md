# Using C7EMR - WASM with Go

Status: ⚠️ partially working, not recommended yet. Plain computation runs fine; anything that needs to call *into* JavaScript (`syscall/js`) currently panics. Read the [known issue](#known-issue-syscalljs-is-broken) before relying on this.

## 1. Compile your code to WebAssembly

```shell
GOOS=js GOARCH=wasm go build -o main.wasm main.go
```

You also need Go's own JS runtime glue, `wasm_exec.js`, copied alongside your compiled `.wasm`:

```shell
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .
```

## 2. Wire it up in your `.modinfo`

Same reasoning as the [Rust guide](rust.md): don't declare either file as `<UIScripts>`, since `wasm_exec.js`'s own top-level code needs `WebAssembly`/`TextEncoder`/`TextDecoder`/`crypto` to already exist. Declare both as `<ImportFiles>`:

```xml
<Dependencies>
    <Mod id="ytm-c7emr-wasm" title="C7EMR - WASM" />
</Dependencies>
...
<ActionGroups>
    <ActionGroup id="your-mod-game" scope="game" criteria="always">
        <Actions>
            <UIScripts>
                <Item>ui/your-mod-entry.js</Item>
            </UIScripts>
            <ImportFiles>
                <Item>ui/wasm_exec.js</Item>
                <Item>ui/main.wasm</Item>
            </ImportFiles>
        </Actions>
    </ActionGroup>
    <!-- can and/or specify an ActionGroup with scope="shell" -->
</ActionGroups>
```

## 3. Write an entry script

Go doesn't use wasm-bindgen's `_bg.wasm`/`.js` pairing or `initSync` - it has its own loading convention (a `Go` class from `wasm_exec.js`, `WebAssembly.instantiate`, then `go.run(...)`). `C7EMR.loadWasm` is built around wasm-bindgen's convention specifically, so it doesn't apply here. Load `wasm_exec.js` and the `.wasm` bytes yourself, using `C7EMR.fetchBytes` for the binary:

```js
(function waitForC7emr() {
    if (typeof C7EMR === 'undefined' || typeof C7EMR.fetchBytes !== 'function') {
        setTimeout(waitForC7emr, 10);
        return;
    }

    var execScript = document.createElement('script');
    execScript.src = 'fs://game/<your-mod-id>/ui/wasm_exec.js';
    execScript.onload = function () {
        var go = new Go();
        C7EMR.fetchBytes(
            '<your-mod-id>/ui/main.wasm',
            function (bytes) {
                WebAssembly.instantiate(bytes, go.importObject)
                    .then(function (result) {
                        go.run(result.instance);
                    })
                    .catch(function (err) {
                        console.error('instantiate failed:', err);
                    });
            },
            function (err) {
                console.error('wasm fetch failed:', err);
            }
        );
    };
    execScript.onerror = function () {
        console.error('failed to load wasm_exec.js');
    };
    (document.head || document.body || document.documentElement).appendChild(execScript);
})();
```

## Known issue: `syscall/js` is broken

Go's runtime bootstraps, schedules goroutines, and runs the garbage collector correctly under [polywasm](https://github.com/evanw/polywasm) (the WebAssembly polyfill this mod uses). Plain computation works. But `syscall/js` - the mechanism Go uses to read/call into JavaScript values (`js.Global().Get(...)`, `.Call(...)`, etc.) - panics with `syscall/js: call of Value.Get on undefined`, even when the target object genuinely has the property being looked up.

Tracing it down: the JS glue's `valueGet` function decodes the property name argument (a Go string, passed as a pointer+length pair through linear memory) to an **empty string**, every time, regardless of what property was actually requested. The target object resolves correctly; only the property name string comes back empty. This reproduces identically across Go 1.21.13 through 1.26.5, so it isn't a Go-version regression - it looks like a bug in how polywasm interprets this specific string-marshaling instruction pattern.

Practical effect: even `fmt.Println`/`log.Println` don't work, because on `js/wasm`, `os` (and therefore `fmt`) transitively imports `syscall`, whose package-level `init()` calls `js.Global().Get("fs")` - which hits this same bug before `main()` even runs. The only thing confirmed to work is Go's builtin `println()` (lowercase, no import), which bypasses `syscall`/`syscall/js` entirely and writes directly through a lower-level runtime hook.

This isn't something fixable from the mod side - it would mean patching polywasm itself. Until/unless that happens, treat Go as good for self-contained computation only, with `println()` for debug output, and nothing that touches `syscall/js` (which rules out most real interop: logging via `fmt`, DOM access, exposing Go functions to JS, etc.).
