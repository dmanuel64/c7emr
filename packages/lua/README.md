<p align="center">
  <img src="../../images/c7emr_lua_logo.png" alt="C7EMR logo" width="200">
</p>

# C7EMR - Lua

**C7EMR - Lua** is the Lua mod for [C7EMR](../../README.md). It lets you write Civilization 7 mods in Lua instead of JavaScript, running on [Fengari](https://fengari.io/), a Lua 5.3 VM written in pure JS.

## Using this mod from your own mod

1. Write your mod logic in one or more `.lua` files.
2. Declare them as `<ImportFiles>` in your `.modinfo` (not `<UIScripts>` - see below for why).
3. Write a small JS entry script that loads your main `.lua` file once this mod's loader is ready.

See the [Lua guide](docs/lua.md) for the full walkthrough.

## Steam Workshop

<!-- TODO: link to the published Steam Workshop page -->
