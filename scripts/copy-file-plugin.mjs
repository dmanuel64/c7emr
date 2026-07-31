import fs from 'node:fs';
import path from 'node:path';

/**
 * Rollup plugin: copies an arbitrary file next to the built output, unmodified.
 * Used for runtime assets that must ship as real, un-bundled classic scripts
 * (see packages/python's use of brython.js/brython_stdlib.js - bundling them
 * through commonjs breaks Brython's own eval-based codegen).
 *
 * @param {string} srcPath path to the file to copy, relative to the rollup config
 * @param {string} [destName] filename to give it in dist/ui/ (defaults to srcPath's basename)
 */
export default function copyFile(srcPath, destName) {
    return {
        name: 'copy-file',
        writeBundle(outputOptions) {
            const distDir = path.dirname(outputOptions.file);
            fs.copyFileSync(srcPath, path.join(distDir, destName || path.basename(srcPath)));
        }
    };
}
