// @ts-check
const { highlightLine, getCommentContent, getCommentRegExp } = require('./transformerUtils');
const { getScope } = require('../storeUtils');

/**
 * @param {Record<string, string>} languageAliases
 * @param {GatsbyCache} cache
 */
function createHighlightDirectiveLineTransformer(languageAliases, cache) {
  let grammarCache;
  /** @type {LineTransformer<HighlightCommentTransfomerState>} */
  const transformer = async ({ line, language, state }) => {
    if (!grammarCache) {
      grammarCache = await cache.get('grammars');
    }

    const scope = getScope(language, grammarCache, languageAliases);
    const commentContent = getCommentContent(line.text, scope, /*trim*/ true);

    if (commentContent === 'highlight-start') {
      return { state: { inHighlightRange: true } }; // no `line` - drop this line from output
    }
    if (commentContent === 'highlight-end') {
      return { state: { inHighlightRange: false } }; // again no `line`
    }
    if (commentContent === 'highlight-next-line') {
      return { state: { highlightNextLine: true } }; // again no `line`
    }
    if (commentContent === 'highlight-line' || (state && state.inHighlightRange)) {
      // return attrs with added class name, text with comment removed, current state
      return {
        line: highlightLine(line, line.text.replace(getCommentRegExp(scope), '')),
        state,
        data: { isHighlighted: true },
        setContainerClassName: 'grvsc-has-line-highlighting'
      };
    }
    if (state && state.highlightNextLine) {
      // return unchanged text, attrs with added class name, and state with highlightNextLine set
      // to false but preserve inHighlightRange so that a misplaced 'highlight-next-line'
      // doesn't disrupt a highlight range
      return {
        line: highlightLine(line),
        state: { ...state, highlightNextLine: false },
        data: { isHighlighted: true },
        setContainerClassName: 'grvsc-has-line-highlighting'
      };
    }
    return { line, state }; // default: don’t change anything, propagate state to next call
  };

  transformer.displayName = 'highlightCommentDirective';
  transformer.schemaExtension = `
    type GRVSCTokenizedLine {
      isHighlighted: Boolean
    }
  `;

  return transformer;
}

module.exports = { createHighlightDirectiveLineTransformer };
