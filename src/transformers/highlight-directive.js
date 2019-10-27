// @ts-check
const { highlightClassName } = require('../lineHighlighting');

/**
 * @param {object} attrs
 * @param {string} className
 */
const addClassName = (attrs, className) => ({
  ...attrs,
  className: attrs.className ? attrs.className + ` ` + className : className
});

/**
 * @param {string} language
 * @return {function} curried function taking a string argument and
 *   prefixing/wrapping that with a language's comment syntax
 */
const getCommentForLanguage = language => str => {
  switch (language) {
    case 'js':
    case 'ts':
    case 'php':
    case 'swift':
    case 'c#':
      return `// ${str}`;
    case 'python':
    case 'ruby':
    case 'bash':
    case 'perl':
      return `# ${str}`;
    case 'css':
    case 'c':
    case 'objc':
      return `/* ${str} */`;
    case 'html':
    case 'xml':
      return `<!-- ${str} -->`;
    case 'clojure':
      return `; ${str}`;
    case 'sql':
      return `-- ${str}`;
    case 'fortran':
      return `! ${str}`;
    default:
      return `// ${str}`;
  }
};

/**
 * @param {string} text
 * @param {function} commentWrapper
 * @return {function} curried function taking a directive string and checking
 *   whether it equals the line text
 */
const textIsHighlightDirective = (text, commentWrapper) => directive =>
  ['// ' + directive, commentWrapper(directive)].includes(text.trim());

/**
 * @returns {LineTransformer<HighlightCommentTransfomerState>}
 */
function createHighlightDirectiveLineTransformer() {
  return ({ line: { text, attrs } = {}, language, state }) => {
    const commentWrapper = getCommentForLanguage(language);
    const isDirective = textIsHighlightDirective(text, commentWrapper);
    if (isDirective('highlight-start')) {
      return { state: { inHighlightRange: true } }; // no `line` - drop this line from output
    }
    if (isDirective('highlight-end')) {
      return { state: { inHighlightRange: false } }; // again no `line`
    }
    if (isDirective('highlight-next-line')) {
      return { state: { highlightNextLine: true } }; // again no `line`
    }
    if (
      text.endsWith(commentWrapper('highlight-line') || text.endsWith('// highlight-line')) ||
      (state && state.inHighlightRange)
    ) {
      // return attrs with added class name, text with comment removed, current state
      return {
        line: {
          text: text.replace(commentWrapper('highlight-line'), '').replace('// highlight-line', ''),
          attrs: addClassName(attrs, highlightClassName)
        },
        state
      };
    }
    if (state && state.highlightNextLine) {
      // return unchanged text, attrs with added class name, and state with highlightNextLine set
      // to false but preserve inHighlightRange so that a misplaced 'highlight-next-line'
      // doesn't disrupt a highlight range
      return {
        line: { text, attrs: addClassName(attrs, highlightClassName) },
        state: { ...state, highlightNextLine: false }
      };
    }
    return { line: { text, attrs }, state }; // default: don’t change anything, propagate state to next call
  };
}

module.exports = { createHighlightDirectiveLineTransformer };
