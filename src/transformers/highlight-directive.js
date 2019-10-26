// @ts-check
const { highlightClassName } = require('../lineHighlighting');

/**
 * @returns {LineTransformer<HighlightCommentTransfomerState>}
 */
function createHighlightDirectiveLineTransformer() {
  return ({ line: { text, attrs } = {}, language, state }) => {
    //     directiveText = getCommentForLanguage(language, directiveText)
    const commentFn = getCommentForLanguage(language)
    if (text.endsWith(commentFn('highlight-start'))) {
      return { state: { inHighlightRange: true } }; // no `line` - drop this line from output
    }
    if (text.endsWith(commentFn('highlight-end'))) {
      return { state: { inHighlightRange: false } }; // again no `line`
    }
    if (text.endsWith(commentFn('highlight-next-line'))) {
      return { state: { highlightNextLine: true } }; // again no `line`
    }
    if (text.endsWith(commentFn('highlight-line')) || state && state.inHighlightRange) {
      // return attrs with added class name, text with comment removed, current state
      return {
        line: {
          text: text.replace(commentFn('highlight-line'), ''),
          attrs: addClassName(attrs, highlightClassName),
        },
        state,
      };
    }
    if (state && state.highlightNextLine) {
      // return unchanged text, attrs with added class name, and state with highlightNextLine set
      // to false but preserve inHighlightRange so that a misplaced 'highlight-next-line'
      // doesn't disrupt a highlight range
      return {
        line: { text, attrs: addClassName(attrs, highlightClassName) },
        state: { ...state, highlightNextLine: false },
      }
    }
    return { line: { text, attrs }, state }; // default: don’t change anything, propagate state to next call
  };
}

module.exports = createHighlightDirectiveLineTransformer;
