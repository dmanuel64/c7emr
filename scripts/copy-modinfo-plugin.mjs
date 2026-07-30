import fs from 'node:fs';
import path from 'node:path';

/**
 * Rollup plugin: copies the given .modinfo file next to the built output's
 * containing directory (e.g. dist/ui/foo.js -> dist/foo.modinfo), so dist/
 * ends up as a complete, shippable mod folder from a single `rollup --config`
 * run - no separate copy step needed.
 *
 * @param {string} modinfoFilename e.g. "c7emr-wasm.modinfo"
 */
export default function copyModinfo(modinfoFilename) {
    return {
        name: 'copy-modinfo',
        writeBundle(outputOptions) {
            const distDir = path.dirname(path.dirname(outputOptions.file));
            fs.copyFileSync(modinfoFilename, path.join(distDir, modinfoFilename));
        }
    };
}
