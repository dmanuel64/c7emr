# Using C7EMR - Python

Status: ✅ loading and running `.py` files works end-to-end, via [Brython](https://brython.info/).

## 1. Write your Python

Standard Python 3, as implemented by Brython - including standard library imports (`brython_stdlib.js` is loaded alongside `brython.js`). Give your entry file a name, e.g. `main.py`:

```python
# main.py
print("hello from Python")
```

Copy it, unmodified, into your mod's `ui/` folder.

## 2. Wire it up in your `.modinfo`

Don't declare your `.py` files as `<UIScripts>`. This mod's loader (`C7EMR.loadPython`, below) fetches and compiles them itself; loading them as ordinary scripts would just have Coherent try (and fail) to parse Python as JS. Declare them as `<ImportFiles>` instead:

```xml
<Dependencies>
    <Mod id="ytm-c7emr-python" title="C7EMR - Python" />
</Dependencies>
...
<ActionGroups>
    <ActionGroup id="your-mod-game" scope="game" criteria="always">
        <Actions>
            <UIScripts>
                <Item>ui/your-mod-entry.js</Item>
            </UIScripts>
            <ImportFiles>
                <Item>ui/main.py</Item>
            </ImportFiles>
        </Actions>
    </ActionGroup>
    <!-- can and/or specify an ActionGroup with scope="shell" -->
</ActionGroups>
```

## 3. Write a small entry script

Your entry script is the *only* file declared as `<UIScripts>`. It waits for `C7EMR.loadPython` to exist, then hands it the path to your `.py` file:

```js
(function waitForC7emr() {
    if (typeof C7EMR === 'undefined' || typeof C7EMR.loadPython !== 'function') {
        setTimeout(waitForC7emr, 10);
        return;
    }
    C7EMR.loadPython('<your-mod-id>/ui/main.py').catch(function (err) {
        console.error('loadPython failed:', err);
    });
})();
```

The first call to `C7EMR.loadPython` also lazily loads `brython.js` and `brython_stdlib.js` (once, shared across all mods depending on this one) before running your script.

## Errors

Brython prints a full Python traceback to the console itself whenever a loaded script raises an uncaught exception (syntax errors included). `C7EMR.loadPython`'s returned promise also rejects, but only with a short one-line summary - treat the console as the source of truth for debugging, not the caught JS error.

## Sharing state across multiple `loadPython` calls

Every `C7EMR.loadPython` call runs against the same Brython VM, so top-level names set by one script are visible to scripts loaded afterwards - useful for splitting a mod into multiple `.py` files that share state.

## Calling into JS from Python

Brython's built-in [`browser`](https://brython.info/static_doc/en/browser.html) package (bundled in `brython_stdlib.js`) is the normal way to reach into the DOM/JS from Python, e.g. `from browser import window`. This hasn't been exercised against Coherent GT's actual script host yet - treat it as unverified until you've tried it against the real game.
