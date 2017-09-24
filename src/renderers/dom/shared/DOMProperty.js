/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule DOMProperty
 */

'use strict';

var invariant = require('fbjs/lib/invariant');

// These attributes should be all lowercase to allow for
// case insensitive checks
var RESERVED_PROPS = {
  children: true,
  dangerouslySetInnerHTML: true,
  autoFocus: true,
  defaultValue: true,
  defaultChecked: true,
  innerHTML: true,
  suppressContentEditableWarning: true,
  style: true,
};

function checkMask(value, bitmask) {
  return (value & bitmask) === bitmask;
}

function setDOMValueAttribute(node, value) {
  if (value == null) {
    return node.removeAttribute('value');
  }

  // Number inputs get special treatment due to some edge cases in
  // Chrome. Let everything else assign the value attribute as normal.
  // https://github.com/facebook/react/issues/7253#issuecomment-236074326
  if (node.type !== 'number' || node.hasAttribute('value') === false) {
    node.setAttribute('value', '' + value);
  } else if (
    node.validity &&
    !node.validity.badInput &&
    node.ownerDocument.activeElement !== node
  ) {
    // Don't assign an attribute if validation reports bad
    // input. Chrome will clear the value. Additionally, don't
    // operate on inputs that have focus, otherwise Chrome might
    // strip off trailing decimal places and cause the user's
    // cursor position to jump to the beginning of the input.
    //
    // In ReactDOMInput, we have an onBlur event that will trigger
    // this function again when focus is lost.
    node.setAttribute('value', '' + value);
  }
}

var DOMPropertyInjection = {
  /**
   * Mapping from normalized, camelcased property names to a configuration that
   * specifies how the associated DOM property should be accessed or rendered.
   */
  MUST_USE_PROPERTY: 0x1,
  HAS_BOOLEAN_VALUE: 0x4,
  HAS_NUMERIC_VALUE: 0x8,
  HAS_POSITIVE_NUMERIC_VALUE: 0x10 | 0x8,
  HAS_OVERLOADED_BOOLEAN_VALUE: 0x20,
  HAS_STRING_BOOLEAN_VALUE: 0x40,

  /**
   * Inject some specialized knowledge about the DOM. This takes a config object
   * with the following properties:
   *
   * Properties: object mapping DOM property name to one of the
   * DOMPropertyInjection constants or null. If your attribute isn't in here,
   * it won't get written to the DOM.
   *
   * DOMPropertyNames: similar to DOMAttributeNames but for DOM properties.
   * Property names not specified use the normalized name.
   *
   * @param {object} domPropertyConfig the config as described above.
   */
  injectDOMPropertyConfig: function(domPropertyConfig) {
    var Injection = DOMPropertyInjection;
    var Properties = domPropertyConfig.Properties || {};

    for (var propName in Properties) {
      invariant(
        !DOMProperty.properties.hasOwnProperty(propName),
        "injectDOMPropertyConfig(...): You're trying to inject DOM property " +
          "'%s' which has already been injected. You may be accidentally " +
          'injecting the same DOM property config twice, or you may be ' +
          'injecting two configs that have conflicting property names.',
        propName,
      );

      var propConfig = Properties[propName];

      var propertyInfo = {
        mustUseProperty: checkMask(propConfig, Injection.MUST_USE_PROPERTY),
        hasBooleanValue: checkMask(propConfig, Injection.HAS_BOOLEAN_VALUE),
        hasNumericValue: checkMask(propConfig, Injection.HAS_NUMERIC_VALUE),
        hasPositiveNumericValue: checkMask(
          propConfig,
          Injection.HAS_POSITIVE_NUMERIC_VALUE,
        ),
        hasOverloadedBooleanValue: checkMask(
          propConfig,
          Injection.HAS_OVERLOADED_BOOLEAN_VALUE,
        ),
        hasStringBooleanValue: checkMask(
          propConfig,
          Injection.HAS_STRING_BOOLEAN_VALUE,
        ),
      };
      invariant(
        propertyInfo.hasBooleanValue +
          propertyInfo.hasNumericValue +
          propertyInfo.hasOverloadedBooleanValue <=
          1,
        'DOMProperty: Value can be one of boolean, overloaded boolean, or ' +
          'numeric value, but not a combination: %s',
        propName,
      );

      // Downcase references to whitelist properties to check for membership
      // without case-sensitivity. This allows the whitelist to pick up
      // `allowfullscreen`, which should be written using the property configuration
      // for `allowFullscreen`
      DOMProperty.properties[propName] = propertyInfo;
    }
  },
};

/* eslint-disable max-len */
var ATTRIBUTE_NAME_START_CHAR =
  ':A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD';
/* eslint-enable max-len */

var attributeNames = {
  acceptCharset: 'accept-charset',
  className: 'class',
  htmlFor: 'for',
  httpEquiv: 'http-equiv',
};

var CAMELIZE = /[\-\:]([a-z])/g;
var capitalize = token => token[1].toUpperCase();

// TODO: remove this.
var svgConfig = {
  Properties: {
    autoReverse: DOMPropertyInjection.HAS_STRING_BOOLEAN_VALUE,
    externalResourcesRequired: DOMPropertyInjection.HAS_STRING_BOOLEAN_VALUE,
    preserveAlpha: DOMPropertyInjection.HAS_STRING_BOOLEAN_VALUE,
  },
};

/**
 * This is a list of all SVG attributes that need special casing,
 * namespacing, or boolean value assignment.
 *
 * When adding attributes to this list, be sure to also add them to
 * the `possibleStandardNames` module to ensure casing and incorrect
 * name warnings.
 *
 * SVG Attributes List:
 * https://www.w3.org/TR/SVG/attindex.html
 * SMIL Spec:
 * https://www.w3.org/TR/smil
 */
[
  'accent-height',
  'alignment-baseline',
  'arabic-form',
  'baseline-shift',
  'cap-height',
  'clip-path',
  'clip-rule',
  'color-interpolation',
  'color-interpolation-filters',
  'color-profile',
  'color-rendering',
  'dominant-baseline',
  'enable-background',
  'fill-opacity',
  'fill-rule',
  'flood-color',
  'flood-opacity',
  'font-family',
  'font-size',
  'font-size-adjust',
  'font-stretch',
  'font-style',
  'font-variant',
  'font-weight',
  'glyph-name',
  'glyph-orientation-horizontal',
  'glyph-orientation-vertical',
  'horiz-adv-x',
  'horiz-origin-x',
  'image-rendering',
  'letter-spacing',
  'lighting-color',
  'marker-end',
  'marker-mid',
  'marker-start',
  'overline-position',
  'overline-thickness',
  'paint-order',
  'panose-1',
  'pointer-events',
  'rendering-intent',
  'shape-rendering',
  'stop-color',
  'stop-opacity',
  'strikethrough-position',
  'strikethrough-thickness',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'text-anchor',
  'text-decoration',
  'text-rendering',
  'underline-position',
  'underline-thickness',
  'unicode-bidi',
  'unicode-range',
  'units-per-em',
  'v-alphabetic',
  'v-hanging',
  'v-ideographic',
  'v-mathematical',
  'vector-effect',
  'vert-adv-y',
  'vert-origin-x',
  'vert-origin-y',
  'word-spacing',
  'writing-mode',
  'x-height',
  'xlink:actuate',
  'xlink:arcrole',
  'xlink:href',
  'xlink:role',
  'xlink:show',
  'xlink:title',
  'xlink:type',
  'xml:base',
  'xmlns:xlink',
  'xml:lang',
  'xml:space',
].forEach(svgAttributeName => {
  var reactName = svgAttributeName.replace(CAMELIZE, capitalize);
  attributeNames[reactName] = svgAttributeName;

  // TODO: remove this very soon.
  // We only need it until we stop branching on propertyInfo existence.
  svgConfig.Properties[reactName] = 0;
});

/**
 * DOMProperty exports lookup objects that can be used like functions:
 *
 *   > DOMProperty.isValid['id']
 *   true
 *   > DOMProperty.isValid['foobar']
 *   undefined
 *
 * Although this may be confusing, it performs better in general.
 *
 * @see http://jsperf.com/key-exists
 * @see http://jsperf.com/key-missing
 */
var DOMProperty = {
  ID_ATTRIBUTE_NAME: 'data-reactid',
  ROOT_ATTRIBUTE_NAME: 'data-reactroot',

  ATTRIBUTE_NAME_START_CHAR: ATTRIBUTE_NAME_START_CHAR,
  ATTRIBUTE_NAME_CHAR: ATTRIBUTE_NAME_START_CHAR +
    '\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040',

  /**
   * Map from property "standard name" to an object with info about how to set
   * the property in the DOM. Each object contains:
   *
   * mustUseProperty:
   *   Whether the property must be accessed and mutated as an object property.
   * hasBooleanValue:
   *   Whether the property should be removed when set to a falsey value.
   * hasNumericValue:
   *   Whether the property must be numeric or parse as a numeric and should be
   *   removed when set to a falsey value.
   * hasPositiveNumericValue:
   *   Whether the property must be positive numeric or parse as a positive
   *   numeric and should be removed when set to a falsey value.
   * hasOverloadedBooleanValue:
   *   Whether the property can be used as a flag as well as with a value.
   *   Removed when strictly equal to false; present without a value when
   *   strictly equal to true; present with a value otherwise.
   */
  properties: {},

  /**
   * Checks whether a property name is a writeable attribute.
   * @method
   */
  shouldSetAttribute: function(name, value) {
    if (DOMProperty.isReservedProp(name)) {
      return false;
    }
    if (
      (name[0] === 'o' || name[0] === 'O') &&
      (name[1] === 'n' || name[1] === 'N')
    ) {
      return false;
    }
    if (value === null) {
      return true;
    }
    switch (typeof value) {
      case 'boolean':
        return DOMProperty.shouldAttributeAcceptBooleanValue(name);
      case 'undefined':
      case 'number':
      case 'string':
      case 'object':
        return true;
      default:
        // function, symbol
        return false;
    }
  },

  getAttributeName(propName) {
    return attributeNames.hasOwnProperty(propName)
      ? attributeNames[propName]
      : propName.toLowerCase();
  },

  getAttributeNamespace(propName) {
    switch (propName) {
      case 'xmlBase':
      case 'xmlLang':
      case 'xmlSpace':
        return 'http://www.w3.org/XML/1998/namespace';
      case 'xlinkActuate':
      case 'xlinkArcrole':
      case 'xlinkHref':
      case 'xlinkRole':
      case 'xlinkShow':
      case 'xlinkTitle':
      case 'xlinkType':
        return 'http://www.w3.org/1999/xlink';
      default:
        return null;
    }
  },

  // If non-null, used instead of the property or `setAttribute()`.
  getMutationMethod(propName) {
    switch (propName) {
      case 'value':
        return setDOMValueAttribute;
      default:
        return null;
    }
  },

  getPropertyInfo(name) {
    return DOMProperty.properties.hasOwnProperty(name)
      ? DOMProperty.properties[name]
      : null;
  },

  shouldAttributeAcceptBooleanValue(name) {
    if (DOMProperty.isReservedProp(name)) {
      return true;
    }
    let propertyInfo = DOMProperty.getPropertyInfo(name);
    if (propertyInfo) {
      return (
        propertyInfo.hasBooleanValue ||
        propertyInfo.hasStringBooleanValue ||
        propertyInfo.hasOverloadedBooleanValue
      );
    }
    var prefix = name.toLowerCase().slice(0, 5);
    return prefix === 'data-' || prefix === 'aria-';
  },

  /**
   * Checks to see if a property name is within the list of properties
   * reserved for internal React operations. These properties should
   * not be set on an HTML element.
   *
   * @private
   * @param {string} name
   * @return {boolean} If the name is within reserved props
   */
  isReservedProp(name) {
    return RESERVED_PROPS.hasOwnProperty(name);
  },

  injection: DOMPropertyInjection,
};

// TODO: remove this very soon.
// We only need it until we stop branching on propertyInfo existence.
DOMProperty.injection.injectDOMPropertyConfig(svgConfig);

module.exports = DOMProperty;
