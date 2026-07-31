# Using C7EMR - Lua

Status: ✅ loading and running `.lua` files works end-to-end, via [Fengari](https://fengari.io/) + [fengari-web](https://github.com/fengari-lua/fengari-web).

## 1. Write your Lua

Nothing special is required - it's standard Lua 5.3, as implemented by Fengari. Give your entry file a name, e.g. `main.lua`:

```lua
-- main.lua
print("hello from Lua")
return 42
```

Copy it, unmodified, into your mod's `ui/` folder.

## 2. Wire it up in your `.modinfo`

Don't declare your `.lua` files as `<UIScripts>`. This mod's loader (`C7EMR.loadLua`, below) fetches and compiles them itself once its own script has run:

```xml
<Dependencies>
    <Mod id="ytm-c7emr-lua" title="C7EMR - Lua" />
</Dependencies>
...
<ActionGroups>
    <ActionGroup id="your-mod-game" scope="game" criteria="always">
        <Actions>
            <UIScripts>
                <Item>ui/your-mod-entry.js</Item>
            </UIScripts>
            <ImportFiles>
                <Item>ui/main.lua</Item>
            </ImportFiles>
        </Actions>
    </ActionGroup>
    <!-- can and/or specify an ActionGroup with scope="shell" -->
</ActionGroups>
```

## 3. Write a small entry script

Your entry script is the *only* file declared as `<UIScripts>`. It waits for `C7EMR.loadLua` to exist, then hands it the path to your `.lua` file:

```js
(function waitForC7emr() {
    if (typeof C7EMR === 'undefined' || typeof C7EMR.loadLua !== 'function') {
        setTimeout(waitForC7emr, 10);
        return;
    }
    C7EMR.loadLua('<your-mod-id>/ui/main.lua').catch(function (err) {
        console.error('loadLua failed:', err);
    });
})();
```

`C7EMR.loadLua` fetches the file's source text, compiles and runs it against this mod's shared Lua state, and resolves with whatever the chunk returns (`42` in the example above).

## Calling into JS from Lua

`fengari-web` opens the `js` library by default, so Lua code can reach back into JS globals - always use `:` (method-call) syntax, never `.`:

```lua
js.global.console:log("hello from Lua")
```

## Sharing state across multiple `loadLua` calls

Every `C7EMR.loadLua` call runs against the *same* Fengari VM instance (`fengari-web`'s `L`), so globals set by one script are visible to scripts loaded afterwards - useful for splitting a mod into multiple `.lua` files that share state.
