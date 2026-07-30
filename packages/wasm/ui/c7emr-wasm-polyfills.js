(function () {
	'use strict';

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var polyfills$1 = {};

	var hasRequiredPolyfills;

	function requirePolyfills () {
		if (hasRequiredPolyfills) return polyfills$1;
		hasRequiredPolyfills = 1;
		// Civ7's script host lacks TextEncoder/TextDecoder (confirmed by testing against
		// the live game). wasm-bindgen's generated glue needs both for string marshaling
		// at module-parse time, so this has to win the load race against a consuming
		// mod's own script - kept deliberately tiny and dependency-free for that reason.
		// Guarded so a native implementation always wins if one exists.
		if (typeof globalThis.TextEncoder === 'undefined') {
		    globalThis.TextEncoder = function TextEncoder() {
		        this.encode = function (str) {
		            const utf8 = [];
		            for (let i = 0; i < str.length; i++) {
		                let charcode = str.charCodeAt(i);
		                if (charcode < 0x80) {
		                    utf8.push(charcode);
		                } else if (charcode < 0x800) {
		                    utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
		                } else if (charcode < 0xd800 || charcode >= 0xe000) {
		                    utf8.push(
		                        0xe0 | (charcode >> 12),
		                        0x80 | ((charcode >> 6) & 0x3f),
		                        0x80 | (charcode & 0x3f),
		                    );
		                } else {
		                    i++;
		                    charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
		                    utf8.push(
		                        0xf0 | (charcode >> 18),
		                        0x80 | ((charcode >> 12) & 0x3f),
		                        0x80 | ((charcode >> 6) & 0x3f),
		                        0x80 | (charcode & 0x3f),
		                    );
		                }
		            }
		            return new Uint8Array(utf8);
		        };
		    };
		}

		if (typeof globalThis.TextDecoder === 'undefined') {
		    globalThis.TextDecoder = function TextDecoder(_label, _options) {
		        this.decode = function (bytes) {
		            if (bytes === undefined) return '';
		            let result = '';
		            let i = 0;
		            while (i < bytes.length) {
		                const b1 = bytes[i++];
		                if (b1 < 0x80) {
		                    result += String.fromCharCode(b1);
		                } else if ((b1 & 0xe0) === 0xc0) {
		                    const b2 = bytes[i++];
		                    result += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f));
		                } else if ((b1 & 0xf0) === 0xe0) {
		                    const b2 = bytes[i++];
		                    const b3 = bytes[i++];
		                    result += String.fromCharCode(((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f));
		                } else if ((b1 & 0xf8) === 0xf0) {
		                    const b2 = bytes[i++];
		                    const b3 = bytes[i++];
		                    const b4 = bytes[i++];
		                    let cp = ((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
		                    cp -= 0x10000;
		                    result += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
		                }
		            }
		            return result;
		        };
		    };
		}

		console.warn(
		    `[c7emr-wasm-polyfills] loaded at ${Date.now()}; TextDecoder=${typeof globalThis.TextDecoder} TextEncoder=${typeof globalThis.TextEncoder}`
		);
		return polyfills$1;
	}

	var polyfillsExports = requirePolyfills();
	var polyfills = /*@__PURE__*/getDefaultExportFromCjs(polyfillsExports);

	return polyfills;

})();
