const { last, flatMap, escapeHTML } = require('../utils');
const { createThemeCSSRules } = require('./css');
const { joinClassNames } = require('../renderers/css');
const { pre, code, span, style, TriviaRenderFlags, mergeAttributes } = require('../renderers/html');

/**
 * @param {RegisteredToken} token
 */
function createTokenElement(token) {
  const className = joinClassNames(
    token.defaultThemeTokenData.className,
    ...token.additionalThemeTokenData.map(t => t.className)
  );
  return span({ class: className }, [escapeHTML(token.text)], {
    whitespace: TriviaRenderFlags.NoWhitespace
  });
}

/**
 * @param {Line} line
 * @param {any} meta
 * @param {number} index
 * @param {string | undefined} language
 * @param {(lineData: LineData) => string} getLineClassName
 * @param {grvsc.HTMLElement[] | string} tokens
 */
function createLineElement(line, meta, index, language, getLineClassName, tokens) {
  /** @type {LineData} */
  const lineData = { meta, index, content: line.text, language };
  const lineClassName = joinClassNames(getLineClassName(lineData), 'grvsc-line');
  const attrs = mergeAttributes({ class: lineClassName }, line.attrs);
  const children = typeof tokens === 'string' ? [tokens] : mergeSimilarTokens(tokens);
  const gutterCells = line.gutterCells.map(createGutterCellElement);
  if (gutterCells.length) {
    gutterCells.unshift(span({ class: 'grvsc-gutter-pad' }, undefined, { whitespace: TriviaRenderFlags.NoWhitespace }));
  }
  return span(
    attrs,
    [...gutterCells, span({ class: 'grvsc-source' }, children, { whitespace: TriviaRenderFlags.NoWhitespace })],
    { whitespace: TriviaRenderFlags.NoWhitespace }
  );
}

/** @param {GutterCell | undefined} cell */
function createGutterCellElement(cell) {
  return span(
    {
      class: joinClassNames('grvsc-gutter', cell && cell.className),
      'aria-hidden': 'true',
      'data-content': cell && cell.text
    },
    [],
    { whitespace: TriviaRenderFlags.NoWhitespace }
  );
}

/**
 * @param {number} index
 * @param {string} language
 * @param {string | undefined} className
 * @param {grvsc.HTMLElement[]} tokens
 */
function createCodeSpanElement(index, language, className, tokens) {
  return code({ class: className, 'data-language': language, 'data-index': index }, tokens, {
    whitespace: TriviaRenderFlags.NoWhitespace
  });
}

/**
 * Returns the token element array with contiguous spans having the same class name
 * merged into a single span to minimize the number of elements returned.
 * @param {grvsc.HTMLElement[]} tokenElements
 */
function mergeSimilarTokens(tokenElements) {
  return tokenElements.reduce((elements, element) => {
    const prev = last(elements);
    if (typeof prev === 'object' && element.attributes.class === prev.attributes.class) {
      prev.children.push(...element.children);
    } else {
      elements.push(element);
    }
    return elements;
  }, []);
}

/**
 * @param {string} preClassName
 * @param {string} codeClassName
 * @param {string | undefined} languageName
 * @param {number} index
 * @param {(grvsc.HTMLElement | string)[]} lineElements
 */
function createCodeBlockElement(preClassName, codeClassName, languageName, index, lineElements) {
  return pre(
    { class: preClassName, 'data-language': languageName, 'data-index': index },
    [
      code({ class: codeClassName }, lineElements, {
        whitespace: TriviaRenderFlags.NewlineBetweenChildren
      })
    ],
    { whitespace: TriviaRenderFlags.NoWhitespace }
  );
}

/**
 * @param {{ theme: ConditionalTheme, settings: Record<string, string> }[]} possibleThemes
 * @param {(themeIdentifier: string) => { className: string, css: grvsc.CSSDeclaration[] }[]} getTokenStylesForTheme
 * @param {(color: string, themeIdentifier: string) => string} replaceColor
 * @param {string | undefined} injectedStyles
 * @returns {grvsc.HTMLElement | undefined}
 */
function createStyleElement(possibleThemes, getTokenStylesForTheme, replaceColor, injectedStyles) {
  const rules = flatMap(possibleThemes, ({ theme, settings }) => {
    return createThemeCSSRules(theme, settings, getTokenStylesForTheme(theme.identifier), replaceColor);
  });

  if (rules.length || injectedStyles) {
    return style({ class: 'grvsc-styles' }, [injectedStyles || '', ...rules]);
  }
}

module.exports = {
  createTokenElement,
  createLineElement,
  createCodeBlockElement,
  createStyleElement,
  createCodeSpanElement
};
