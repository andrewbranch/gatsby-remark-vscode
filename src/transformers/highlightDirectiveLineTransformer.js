// @ts-check
const { highlightLine } = require('./transformerUtils');

/**
 * @param {string} language
 * @param {object} languageCommentMap
 * @return {(commentMessage: string) => string} curried function taking a string argument and
 *   prefixing/wrapping that with a language's comment syntax
 */
const getCommentForLanguage = (language, languageCommentMap) => message => {
  // example: languageCommentMap = {js: str => `// ${str}`}
  if (languageCommentMap[language]) return languageCommentMap[language](message);
  if (['js', 'ts', 'php', 'swift', 'c#', 'go', 'java', 'jsonc'].includes(language)) return `// ${message}`;
  if (['python', 'ruby', 'shell', 'perl', 'coffee', 'yaml'].includes(language)) return `# ${message}`;
  if (['css', 'c', 'cpp', 'objc', 'less'].includes(language)) return `/* ${message} */`;
  if (['html', 'xml', 'markdown'].includes(language)) return `<!-- ${message} -->`;
  if (['clojure'].includes(language)) return `; ${message}`;
  if (['sql'].includes(language)) return `-- ${message}`;
  if (['fortran'].includes(language)) return `! ${message}`;
  return `// ${message}`;
};

/**
 * @param {string} text
 * @param {(directive: string) => string} commentWrapper
 * @return {(directive: string) => boolean} curried function taking a directive string and checking
 *   whether it equals the line text
 */
const textIsHighlightDirective = (text, commentWrapper) => directive =>
  ['// ' + directive, commentWrapper(directive)].includes(text.trim());

/**
 * @param {object} languageCommentMap user-defined object mapping language keys to commenting functions
 * @returns {LineTransformer<HighlightCommentTransfomerState>}
 */
function createHighlightDirectiveLineTransformer(languageCommentMap) {
  return ({ line, language, state }) => {
    const commentWrapper = getCommentForLanguage(language, languageCommentMap);
    const isDirective = textIsHighlightDirective(line.text, commentWrapper);
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
      line.text.endsWith(commentWrapper('highlight-line')) ||
      line.text.endsWith('// highlight-line') ||
      (state && state.inHighlightRange)
    ) {
      // return attrs with added class name, text with comment removed, current state
      return {
        line: highlightLine(
          line,
          line.text.replace(commentWrapper('highlight-line'), '').replace('// highlight-line', '')
        ),
        state
      };
    }
    if (state && state.highlightNextLine) {
      // return unchanged text, attrs with added class name, and state with highlightNextLine set
      // to false but preserve inHighlightRange so that a misplaced 'highlight-next-line'
      // doesn't disrupt a highlight range
      return {
        line: highlightLine(line),
        state: { ...state, highlightNextLine: false }
      };
    }
    return { line, state }; // default: don’t change anything, propagate state to next call
  };
}

module.exports = { createHighlightDirectiveLineTransformer };
