import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import copyModinfo from '../../scripts/copy-modinfo-plugin.mjs';
import copyFile from '../../scripts/copy-file-plugin.mjs';
import patchUnicodePropertyRegex from '../../scripts/patch-unicode-property-regex-plugin.mjs';
import patchUnicodeCategoryLookup from '../../scripts/patch-unicode-category-lookup-plugin.mjs';

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
        copyFile('../../node_modules/brython/brython_stdlib.js'),
        // See patch-unicode-property-regex-plugin.mjs for why: Coherent GT can't
        // evaluate `\p{...}` regex literals, and Brython's core constructs several
        // of these unconditionally at module init.
        patchUnicodePropertyRegex('brython.js', [
            ['\\p{Cc}|\\p{Cf}|\\p{Co}|\\p{Cs}|\\p{Zl}|\\p{Zp}|\\p{Zs}', 'u'],
            ['\\p{Letter}', 'u'],
            ['\\p{Nl}', 'u'],
            ['\\p{Mn}|\\p{Mc}|\\p{Nd}|\\p{Pc}', 'u'],
            ['\\p{Nd}|\\p{Nl}|\\p{No}', 'u'],
            ['\\p{Cn}', 'u'],
            ['\\p{Nd}', 'u']
        ]),
        patchUnicodePropertyRegex(
            'brython_stdlib.js',
            [
                ['\\p{L}', 'u'],
                ['\\p{Cn}', 'u']
            ],
            true
        ),
        // The one *dynamic* `\p{...}` construction ($B.in_unicode_category, deliberately
        // excluded from patchUnicodePropertyRegex above) needs a different fix - see
        // patch-unicode-category-lookup-plugin.mjs for why its own try/catch fallback
        // isn't actually sufficient.
        patchUnicodeCategoryLookup('brython.js')
    ]
};