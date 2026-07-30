# Using C7EMR - WASM with Go

Status: ⚠️ partially working. Plain computation works; calling into JavaScript (`syscall/js`) doesn't yet - see [Known issue](#known-issue-syscalljs-is-broken).

## 1. Compile your code to WebAssembly

```shell
GOOS=js GOARCH=wasm go build -o main.wasm main.go
```

You also need Go's own JS runtime glue, `wasm_exec.js`, copied alongside your compiled `.wasm`:

```shell
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .
```

(Older Go versions ship it at `misc/wasm/wasm_exec.js` instead.) Copy both files, unmodified, into your mod's `ui/` folder.

## 2. Wire it up in your `.modinfo`

Same reasoning as the [Rust guide](rust.md): don't declare either file as `<UIScripts>`, since `wasm_exec.js` needs `WebAssembly`/`TextEncoder`/`TextDecoder`/`crypto` to already exist. Declare both as `<ImportFiles>`:

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

Go has its own loading convention (a `Go` class from `wasm_exec.js`, `WebAssembly.instantiate`, then `go.run(...)`) instead of wasm-bindgen's - so `C7EMR.loadWasm` doesn't apply here. Load `wasm_exec.js` and the `.wasm` bytes yourself, using `C7EMR.fetchBytes` for the binary:

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

`syscall/js` - Go's mechanism for calling into JavaScript (`js.Global().Get(...)`, `.Call(...)`, etc.) - panics under [polywasm](https://github.com/evanw/polywasm), the WebAssembly polyfill this mod uses. This also breaks `fmt.Println`/`log.Println`, since both transitively import `syscall` on `js/wasm`. Only Go's builtin `println()` (no import) is confirmed to work, since it bypasses `syscall` entirely.

This reproduces identically on Go 1.21 through 1.26, so it isn't a Go-version issue - it looks like a polywasm bug, and isn't fixable from this mod's side. Until it's fixed upstream, treat Go as computation-only.
