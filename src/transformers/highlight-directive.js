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
 * @param {object} languageCommentMap
 * @return {function} curried function taking a string argument and
 *   prefixing/wrapping that with a language's comment syntax
 */
const getCommentForLanguage = (language, languageCommentMap) => str => {
  // example: languageCommentMap = {js: str => `// ${str}`}
  if (languageCommentMap[language]) return languageCommentMap[language](str);
  if (['js', 'ts', 'php', 'swift', 'c#', 'go', 'java', 'jsonc'].includes(language)) return `// ${str}`;
  if (['python', 'ruby', 'shell', 'perl', 'coffee', 'yaml'].includes(language)) return `# ${str}`;
  if (['css', 'c', 'cpp', 'objc', 'less'].includes(language)) return `/* ${str} */`;
  if (['html', 'xml', 'markdown'].includes(language)) return `<!-- ${str} -->`;
  if (['clojure'].includes(language)) return `; ${str}`;
  if (['sql'].includes(language)) return `-- ${str}`;
  if (['fortran'].includes(language)) return `! ${str}`;
  return `// ${str}`;
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
 * @param {object} languageCommentMap user-defined object mapping language keys to commenting functions
 * @returns {LineTransformer<HighlightCommentTransfomerState>}
 */
function createHighlightDirectiveLineTransformer(languageCommentMap) {
  return ({ line: { text, attrs } = {}, language, state }) => {
    const commentWrapper = getCommentForLanguage(language, languageCommentMap);
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
