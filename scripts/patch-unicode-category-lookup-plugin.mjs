import fs from 'node:fs';
import path from 'node:path';
import rewritePattern from 'regexpu-core';

// Every standard Unicode General_Category value: the 30 two-letter categories
// plus their 7 one-letter "super category" groupings (e.g. "L" matches any of
// Ll/Lm/Lo/Lt/Lu). Brython's $B.in_unicode_category can be called with any of
// these at runtime (e.g. from unicodedata-driven code), so all of them need a
// working entry - unlike the literal patches in patch-unicode-property-regex-plugin.mjs,
// there's no fixed call-site list to enumerate for the dynamic case.
const UNICODE_GENERAL_CATEGORIES = [
    'Cc', 'Cf', 'Cn', 'Co', 'Cs', 'Ll', 'Lm', 'Lo', 'Lt', 'Lu', 'Mc', 'Me', 'Mn', 'Nd', 'Nl', 'No',
    'Pc', 'Pd', 'Pe', 'Pf', 'Pi', 'Po', 'Ps', 'Sc', 'Sk', 'Sm', 'So', 'Zl', 'Zp', 'Zs',
    'C', 'L', 'M', 'N', 'P', 'S', 'Z'
];

const ORIGINAL_FUNCTION =
    "$B.in_unicode_category=function(category,cp){if(isNaN(cp)){return false}\n" +
    "try{\n" +
    "var re=new RegExp('\\\\p{'+category+'}','u')\n" +
    "return re.test(String.fromCodePoint(cp))}catch(err){\n" +
    "return in_unicode_category(category,cp)}}";

/**
 * Rollup plugin: fixes `$B.in_unicode_category` for engines that can't
 * evaluate `\p{...}` regex literals at all (Coherent GT throws "Invalid
 * property name" the instant one is evaluated - see
 * patch-unicode-property-regex-plugin.mjs for the literal-regex-in-source
 * side of this same underlying gap).
 *
 * @param {string} distFilename filename in the built output's ui/ dir, e.g. "brython.js"
 */
export default function patchUnicodeCategoryLookup(distFilename) {
    return {
        name: 'patch-unicode-category-lookup',
        writeBundle(outputOptions) {
            const filePath = path.join(path.dirname(outputOptions.file), distFilename);
            const content = fs.readFileSync(filePath, 'utf8');

            if (!content.includes(ORIGINAL_FUNCTION)) {
                throw new Error(`patch-unicode-category-lookup: $B.in_unicode_category not found in ${distFilename} in the expected form - Brython version may have changed`);
            }

            const entries = UNICODE_GENERAL_CATEGORIES.map((cat) => {
                const pattern = rewritePattern(`\\p{${cat}}`, 'u', { unicodePropertyEscapes: 'transform' });
                return `${cat}:/${pattern}/u`;
            });
            const table = `var $c7emrUnicodeCategoryRegex={${entries.join(',')}};\n`;

            const patchedFunction =
                "$B.in_unicode_category=function(category,cp){if(isNaN(cp)){return false}\n" +
                "var re=$c7emrUnicodeCategoryRegex[category]\n" +
                "if(re){return re.test(String.fromCodePoint(cp))}\n" +
                'return in_unicode_category(category,cp)}';

            // Inserted directly before the function it's used by (rather than
            // prepended to the whole file) so it doesn't displace a leading
            // "use strict" directive prologue elsewhere in the file.
            const patched = content.replace(ORIGINAL_FUNCTION, table + patchedFunction);
            fs.writeFileSync(filePath, patched);
        }
    };
}
