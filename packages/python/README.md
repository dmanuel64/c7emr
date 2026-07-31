<p align="center">
  <img src="../../images/c7emr_python_logo.png" alt="C7EMR logo" width="200">
</p>

# C7EMR - Python

**C7EMR - Python** is the Python mod for [C7EMR](../../README.md). It lets you write Civilization 7 mods in Python instead of JavaScript, running on [Brython](https://brython.info/), a Python 3 implementation that compiles Python to JS in the browser.

## Status

- ✅ Loading and running `.py` files from your mod's own files - confirmed working end-to-end, including the standard library (`brython_stdlib.js`) and Python-level tracebacks on error.

## Why this mod exists

Brython compiles Python to JS at runtime via `eval()`/`new Function()`, which only works if `brython.js` runs as a real top-level classic script, not bundled through rollup/commonjs. So this mod ships `brython.js` and `brython_stdlib.js` unmodified and loads them via a real `<script src>` tag, the same technique [C7EMR - WASM's Go guide](../wasm/docs/go.md) uses for `wasm_exec.js`.

## Using this mod from your own mod

1. Write your mod logic in one or more `.py` files.
2. Declare them as `<ImportFiles>` in your `.modinfo` (not `<UIScripts>`).
3. Write a small JS entry script that loads your main `.py` file once this mod's loader is ready.

See the [Python guide](docs/python.md) for the full walkthrough.

## Steam Workshop

<!-- TODO: link to the published Steam Workshop page -->
