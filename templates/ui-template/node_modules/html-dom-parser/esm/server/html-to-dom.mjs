import { DomHandler } from '../node_modules/domhandler/lib/esm/index.mjs';
import { unsetRootParent } from './utilities.mjs';
import { Parser } from '../node_modules/htmlparser2/dist/esm/Parser.mjs';

/**
 * Parses HTML string to DOM nodes in Node.js.
 *
 * This is the same method as `require('htmlparser2').parseDOM`
 *
 * @see https://github.com/fb55/htmlparser2/blob/v9.0.0/src/index.ts#L44-L46
 * @see https://github.com/fb55/domhandler/tree/v5.0.3#readme
 *
 * @param html - HTML markup.
 * @param options - Parser options.
 * @returns - DOM nodes.
 */
function HTMLDOMParser(html, options) {
    if (typeof html !== 'string') {
        throw new TypeError('First argument must be a string.');
    }
    if (!html) {
        return [];
    }
    var handler = new DomHandler(undefined, options);
    new Parser(handler, options).end(html);
    return unsetRootParent(handler.dom);
}

export { HTMLDOMParser as default };
//# sourceMappingURL=html-to-dom.mjs.map
