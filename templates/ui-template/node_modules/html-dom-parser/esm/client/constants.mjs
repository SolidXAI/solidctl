/**
 * SVG elements are case-sensitive.
 *
 * @see https://developer.mozilla.org/docs/Web/SVG/Element#svg_elements_a_to_z
 */
var CASE_SENSITIVE_TAG_NAMES = [
    'animateMotion',
    'animateTransform',
    'clipPath',
    'feBlend',
    'feColorMatrix',
    'feComponentTransfer',
    'feComposite',
    'feConvolveMatrix',
    'feDiffuseLighting',
    'feDisplacementMap',
    'feDropShadow',
    'feFlood',
    'feFuncA',
    'feFuncB',
    'feFuncG',
    'feFuncR',
    'feGaussianBlur',
    'feImage',
    'feMerge',
    'feMergeNode',
    'feMorphology',
    'feOffset',
    'fePointLight',
    'feSpecularLighting',
    'feSpotLight',
    'feTile',
    'feTurbulence',
    'foreignObject',
    'linearGradient',
    'radialGradient',
    'textPath',
];
var CASE_SENSITIVE_TAG_NAMES_MAP = CASE_SENSITIVE_TAG_NAMES.reduce(function (accumulator, tagName) {
    accumulator[tagName.toLowerCase()] = tagName;
    return accumulator;
}, {});
var CARRIAGE_RETURN = '\r';
var CARRIAGE_RETURN_REGEX = new RegExp(CARRIAGE_RETURN, 'g');
var CARRIAGE_RETURN_PLACEHOLDER = "__HTML_DOM_PARSER_CARRIAGE_RETURN_PLACEHOLDER_".concat(Date.now().toString(), "__");
var CARRIAGE_RETURN_PLACEHOLDER_REGEX = new RegExp(CARRIAGE_RETURN_PLACEHOLDER, 'g');

export { CARRIAGE_RETURN, CARRIAGE_RETURN_PLACEHOLDER, CARRIAGE_RETURN_PLACEHOLDER_REGEX, CARRIAGE_RETURN_REGEX, CASE_SENSITIVE_TAG_NAMES, CASE_SENSITIVE_TAG_NAMES_MAP };
//# sourceMappingURL=constants.mjs.map
