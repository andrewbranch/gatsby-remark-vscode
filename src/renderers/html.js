// @ts-check
const createWriter = require('./createWriter');
const { escapeHTML } = require('../utils');
const { joinClassNames, renderCSS } = require('./css');

/**
 * @param {string} tagName
 * @param {object} attributes
 * @param {(grvsc.HTMLElement | grvsc.CSSElement | string)[]} children
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
 * @returns {(attributes?: object, children?: (grvsc.HTMLElement | grvsc.CSSElement | string)[], options?: grvsc.RenderOptions) => grvsc.HTMLElement}
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
  IndentChildren: 1 << 3,
  SplitStringsIntoLines: 1 << 4
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
      .filter(attr => attributes[attr] !== undefined)
      .map(attr => ` ${attr}="${escapeHTML(attributes[attr])}"`)
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
    writer.writeList(children, child => writeChild(child, whitespace), writeSeparator);
    if (indented) {
      writer.decreaseIndent();
    }

    if (whitespace & TriviaRenderFlags.NewlineBeforeClosingTag) {
      writer.writeNewLine();
    }
    writer.write(`</${tagName}>`);
  }

  /**
   * @param {grvsc.HTMLElement | grvsc.CSSElement | string} child
   * @param {number} parentWhitespace
   */
  function writeChild(child, parentWhitespace) {
    if (typeof child === 'string') {
      if (parentWhitespace & TriviaRenderFlags.SplitStringsIntoLines) {
        writer.writeList(child.split(/\r?\n/), writer.write, writer.writeNewLine);
      } else {
        writer.write(child);
      }
    } else if ('tagName' in child) {
      writeElement(child);
    } else {
      renderCSS([child], writer);
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
