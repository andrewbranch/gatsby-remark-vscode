const escape = require('lodash.escape');

/**
 * @param {string} className
 * @param {string | string[]} propertyList
 */
function renderRule(className, propertyList) {
  return `.${className} {\n${typeof propertyList === 'string' ? propertyList : propertyList.join('\n')}\n}`;
}

/**
 * @param {string} condition
 * @param {string | string[]} rules
 */
function renderMediaQuery(condition, rules) {
  return `@media (${condition}) {\n${typeof rules === 'string' ? rules : rules.join('\n')}\n}`;
}

/**
 * @param {string | string[]} rules
 */
function prefersLight(rules) {
  return renderMediaQuery('prefers-color-scheme: light', rules);
}

/**
 * @param {string | string[]} rules
 */
function prefersDark(rules) {
  return renderMediaQuery('prefers-color-scheme: dark', rules);
}

/**
 * @param {string[]} rules
 * @param {string} prefix
 */
function prefixRules(rules, prefix) {
  return rules.map(rule => (rule.trim() ? prefix + rule : ''));
}

/**
 * @param  {...(string | undefined)} classNames
 */
function joinClassNames(...classNames) {
  let result = '';
  for (const className of classNames) {
    if (className && className.trim()) {
      result += ` ${className}`;
    }
  }

  return result.trim();
}

/**
 * @param {string} tagName
 * @param {object} attributes
 * @param {(ElementTemplate | string)[]} children
 * @param {RenderOptions=} renderOptions
 * @returns {ElementTemplate}
 */
function createElement(tagName, attributes, children, renderOptions) {
  return { tagName, attributes, children, renderOptions };
}

/** @param {...object} attrs */
function mergeAttributes(...attrs) {
  return attrs.reduce((acc, attrs) => {
    const merged = { ...acc, ...attrs };
    if (acc.hasOwnProperty('class')) {
      merged.class = joinClassNames(acc.class, attrs.class);
    }
    return merged;
  }, {});
}

/**
 * @param {string} tagName
 * @returns {(attributes?: object, children?: (ElementTemplate | string)[], options?: RenderOptions) => ElementTemplate}
 */
function factory(tagName) {
  return (attributes, children, options) => createElement(tagName, attributes || {}, children || [], options);
}

const pre = factory('pre');
const code = factory('code');
const span = factory('span');
const style = factory('style');

const TriviaRenderFlags = {
  NoWhitespace: 0,
  NewlineAfterOpeningTag: 1 << 0,
  NewlineBeforeClosingTag: 1 << 1,
  NewlineBetweenChildren: 1 << 2,
  IndentChildren: 1 << 3
};

/**
 * @param {ElementTemplate | string} element
 */
function renderHTML(element, indent = 0) {
  if (typeof element === 'string') {
    return element;
  }
  let whitespace = element.renderOptions && element.renderOptions.whitespace;
  if (whitespace === undefined) {
    whitespace = -1;
  }

  const { tagName, attributes, children } = element;
  const attrs = Object.keys(attributes)
    .map(attr => ` ${attr}="${escape(attributes[attr])}"`)
    .join('');
  let html = '';

  write(`<${tagName}${attrs}>`);
  if (whitespace & TriviaRenderFlags.NewlineAfterOpeningTag) {
    writeNewline();
  }
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (whitespace & TriviaRenderFlags.IndentChildren) {
      writeIndent();
    }
    write(renderHTML(child, indent + 1));
    if (i < children.length - 1 && whitespace & TriviaRenderFlags.NewlineBetweenChildren) {
      writeNewline();
    }
  }
  if (whitespace & TriviaRenderFlags.NewlineBeforeClosingTag) {
    writeNewline();
  }
  write(`</${tagName}>`);
  return html;

  function writeIndent() {
    html += '  '.repeat(indent + 1);
  }
  function writeNewline() {
    html += '\n';
  }
  /** @param {string} str */
  function write(str) {
    html += str;
  }
}

module.exports = {
  renderRule,
  renderMediaQuery,
  prefersDark,
  prefersLight,
  prefixRules,
  joinClassNames,
  createElement,
  mergeAttributes,
  renderHTML,
  pre,
  code,
  span,
  style,
  TriviaRenderFlags
};
