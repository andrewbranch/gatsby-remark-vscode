const escapeHTML = require('lodash.escape');
const { last, flatMap } = require('./utils');
const { groupConditions, getStylesFromThemeSettings, getThemeClassName } = require('./themeUtils');
const { joinClassNames, ruleset, declaration, media } = require('./renderers/css');
const { pre, code, span, style, TriviaRenderFlags, mergeAttributes } = require('./renderers/html');

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
 * @param {grvsc.HTMLElement[]} tokens
 */
function createLineElement(line, meta, index, language, getLineClassName, tokens) {
  /** @type {LineData} */
  const lineData = { meta, index, content: line.text, language };
  const lineClassName = joinClassNames(getLineClassName(lineData), 'grvsc-line');
  const attrs = mergeAttributes({ class: lineClassName }, line.attrs);
  return span(attrs, mergeSimilarTokens(tokens), { whitespace: TriviaRenderFlags.NoWhitespace });
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
    const conditions = groupConditions(theme.conditions);
    /** @type {grvsc.CSSElement[]} */
    const elements = [];
    const tokenClassNames = getTokenStylesForTheme(theme.identifier);
    const containerStyles = getStylesFromThemeSettings(settings);
    if (conditions.default) {
      pushColorRules(elements, '.' + getThemeClassName(theme.identifier, 'default'));
    }
    for (const condition of conditions.parentSelector) {
      pushColorRules(elements, `${condition.value} .${getThemeClassName(theme.identifier, 'parentSelector')}`);
    }
    for (const condition of conditions.matchMedia) {
      /** @type {grvsc.CSSRuleset[]} */
      const ruleset = [];
      pushColorRules(ruleset, '.' + getThemeClassName(theme.identifier, 'matchMedia'));
      elements.push(media(condition.value, ruleset, theme.identifier));
    }
    return elements;

    /**
     * @param {grvsc.CSSElement[]} container
     * @param {string} selector
     * @param {string=} leadingComment
     */
    function pushColorRules(container, selector, leadingComment) {
      if (containerStyles.length) {
        container.push(ruleset(selector, containerStyles, leadingComment));
        leadingComment = undefined;
      }
      for (const { className, css } of tokenClassNames) {
        container.push(
          ruleset(
            `${selector} .${className}`,
            css.map(decl =>
              decl.property === 'color' ? declaration('color', replaceColor(decl.value, theme.identifier)) : decl
            ),
            leadingComment
          )
        );
        leadingComment = undefined;
      }
    }
  });

  if (rules.length || injectedStyles) {
    return style({ class: 'grvsc-styles' }, [injectedStyles || '', ...rules]);
  }
}

module.exports = {
  createTokenElement,
  createLineElement,
  createCodeBlockElement,
  createStyleElement
};
