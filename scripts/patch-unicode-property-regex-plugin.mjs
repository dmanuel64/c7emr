import fs from 'node:fs';
import path from 'node:path';
import rewritePattern from 'regexpu-core';

/**
 * Rollup plugin: rewrites specific `\p{...}` (Unicode property escape) regex
 * literals in an already-copied vendor file into equivalent explicit-range
 * patterns, via regexpu-core (the same transform Babel uses to support
 * targets predating ES2018 property escapes).
 *
 * @param {string} distFilename filename in the built output's ui/ dir, e.g. "brython.js"
 * @param {[pattern: string, flags: string][]} literals every `\p{...}`-bearing pattern/flags pair to rewrite, as it appears unescaped, e.g. ["\\p{Letter}", "u"]
 * @param {boolean} [jsStringEscaped] true if this file stores the source as a JS string literal (brython_stdlib.js's lazily-eval'd module text), so backslashes in both the search and replacement text need doubling to match the on-disk bytes
 */
export default function patchUnicodePropertyRegex(distFilename, literals, jsStringEscaped = false) {
    return {
        name: 'patch-unicode-property-regex',
        writeBundle(outputOptions) {
            const filePath = path.join(path.dirname(outputOptions.file), distFilename);
            let content = fs.readFileSync(filePath, 'utf8');
            for (const [pattern, flags] of literals) {
                const rewritten = rewritePattern(pattern, flags, { unicodePropertyEscapes: 'transform' });
                const escape = (s) => (jsStringEscaped ? s.replace(/\\/g, '\\\\') : s);
                const from = `/${escape(pattern)}/${flags}`;
                const to = `/${escape(rewritten)}/${flags}`;
                if (!content.includes(from)) {
                    throw new Error(`patch-unicode-property-regex: pattern not found in ${distFilename}: ${from}`);
                }
                content = content.split(from).join(to);
            }
            fs.writeFileSync(filePath, content);
        }
    };
}
