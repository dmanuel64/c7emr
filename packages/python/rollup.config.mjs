import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import copyModinfo from '../../scripts/copy-modinfo-plugin.mjs';
import copyFile from '../../scripts/copy-file-plugin.mjs';

export default {
    input: 'src/main.js',
    output: {
        file: 'dist/ui/c7emr-python.js',
        format: 'iife'
    },
    plugins: [
        nodeResolve(),
        commonjs(),
        copyModinfo('c7emr-python.modinfo'),
        // Brython must run as a real, un-bundled classic script: it uses eval()/new
        // Function() internally to compile Python to JS, and that generated code
        // expects to resolve Brython's own internals through the global scope.
        // Wrapping it in rollup's commonjs module shim breaks that. So it's shipped
        // as a plain file and loaded at runtime via a real <script> tag instead
        // (see loadScript in src/main.js).
        copyFile('../../node_modules/brython/brython.js'),
        copyFile('../../node_modules/brython/brython_stdlib.js')
    ]
};