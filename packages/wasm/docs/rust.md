# Using C7EMR - WASM with Rust

Status: ✅ confirmed working end-to-end, via [wasm-bindgen](https://wasm-bindgen.github.io/wasm-bindgen/).

## 1. Compile your code to WebAssembly

```shell
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version <version matching your Cargo.toml's wasm-bindgen dependency exactly>

cargo build --release --target wasm32-unknown-unknown
wasm-bindgen --target no-modules --out-dir out target/wasm32-unknown-unknown/release/<crate_name>.wasm
```

This produces two files: `<crate_name>.js` (the glue) and `<crate_name>_bg.wasm` (the compiled module). Copy both, **unmodified**, into your mod's `ui/` folder - no build step or post-processing needed on your end.

Use `--target no-modules`, not `--target web`/`bundler`. This mod's loader (`C7EMR.loadWasm`, below) loads the glue as a plain classic script, not an ES module.

## 2. Wire it up in your `.modinfo`

Don't declare the glue or `.wasm` file as `<UIScripts>`. The glue's top-level code needs `WebAssembly`/`TextEncoder`/`TextDecoder` to already exist, and loading it as an ordinary script races against this mod's own polyfill install (sometimes it loses). Declare both as `<ImportFiles>` instead:

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
                <Item>ui/<crate_name>.js</Item>
                <Item>ui/<crate_name>_bg.wasm</Item>
            </ImportFiles>
        </Actions>
    </ActionGroup>
    <!-- can and/or specify an ActionGroup with scope="shell" -->
</ActionGroups>
```

## 3. Write a small entry script

Your entry script is the *only* file declared as `<UIScripts>`. It waits for `C7EMR.loadWasm` to exist, then hands it the path to your `_bg.wasm` file:

```js
(function waitForC7emr() {
    if (typeof C7EMR === 'undefined' || typeof C7EMR.loadWasm !== 'function') {
        setTimeout(waitForC7emr, 10);
        return;
    }
    C7EMR.loadWasm('<your-mod-id>/ui/<crate_name>_bg.wasm').catch(function (err) {
        console.error('loadWasm failed:', err);
    });
})();
```

`C7EMR.loadWasm` handles everything else: it derives the glue's path from the `.wasm` path (`_bg.wasm` -> `.js`, wasm-bindgen's own naming convention), loads the glue as a real script, fetches the `.wasm` bytes, and initializes it. If your crate marks its entry point `#[wasm_bindgen(start)]`, it runs automatically as part of this call - nothing further to call yourself.
