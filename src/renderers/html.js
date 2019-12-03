// @ts-check
const escape = require('lodash.escape');
const createWriter = require('./createWriter');
const { joinClassNames } = require('./css');

/**
 * @param {string} tagName
 * @param {object} attributes
 * @param {(grvsc.HTMLElement | string)[]} children
 * @param {grvsc.RenderOptions=} renderOptions
 * @returns {grvsc.HTMLElement}
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
 * @returns {(attributes?: object, children?: (grvsc.HTMLElement | string)[], options?: grvsc.RenderOptions) => grvsc.HTMLElement}
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
 * @param {grvsc.HTMLElement} element
 */
function renderHTML(element) {
  const writer = createWriter();
  writeElement(element);
  return writer.getText();

  /** @param {grvsc.HTMLElement} element */
  function writeElement(element) {
    let whitespace = element.renderOptions && element.renderOptions.whitespace;
    if (whitespace === undefined) {
      whitespace = -1;
    }

    const { tagName, attributes, children } = element;
    const attrs = Object.keys(attributes)
      .map(attr => ` ${attr}="${escape(attributes[attr])}"`)
      .join('');

    writer.write(`<${tagName}${attrs}>`);

    let indented = false;
    if (whitespace & TriviaRenderFlags.NewlineAfterOpeningTag) {
      if (whitespace & TriviaRenderFlags.IndentChildren) {
        writer.increaseIndent();
        indented = true;
      }
      writer.writeNewLine();
    }

    const writeSeparator = whitespace & TriviaRenderFlags.NewlineBetweenChildren ? writer.writeNewLine : writer.noop;
    writer.writeList(children, writeChild, writeSeparator);
    if (indented) {
      writer.decreaseIndent();
    }

    if (whitespace & TriviaRenderFlags.NewlineBeforeClosingTag) {
      writer.writeNewLine();
    }
    writer.write(`</${tagName}>`);
  }

  /** @param {grvsc.HTMLElement | string} child */
  function writeChild(child) {
    if (typeof child === 'string') {
      writer.write(child);
    } else {
      writeElement(child);
    }
  }
}

module.exports = {
  createElement,
  mergeAttributes,
  renderHTML,
  pre,
  code,
  span,
  style,
  TriviaRenderFlags
};
