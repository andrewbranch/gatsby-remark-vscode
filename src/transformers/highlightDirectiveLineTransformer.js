// @ts-check
const { highlightLine } = require('./transformerUtils');
const { getScope } = require('../storeUtils');

/**
 * @param {string} language
 * @param {string} scope
 * @param {Record<string, (message: string) => string>} languageCommentMap
 * @return {(commentMessage: string) => string} curried function taking a string argument and
 *   prefixing/wrapping that with a language's comment syntax
 */
const getCommentForLanguage = (language, scope, languageCommentMap) => message => {
  // example: languageCommentMap = {js: str => `// ${str}`}
  if (languageCommentMap[language]) {
    return languageCommentMap[language](message);
  }

  switch (scope) {
    case 'source.python':
    case 'source.ruby':
    case 'source.shell':
    case 'source.perl':
    case 'source.coffee':
    case 'source.yaml':
      return `# ${message}`;
    case 'source.css':
    case 'source.c':
    case 'source.cpp':
    case 'source.objc':
    case 'source.css.less':
      return `/* ${message} */`;
    case 'text.html.derivative':
    case 'text.xml':
    case 'text.html.markdown':
      return `<!-- ${message} -->`;
    case 'source.clojure':
      return `; ${message}`;
    case 'source.sql':
      return `-- ${message}`;
    default:
      return `// ${message}`;
  }
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
 * @param {Record<string, (message: string) => string>} languageCommentMap user-defined object mapping language keys to commenting functions
 * @param {Record<string, string>} languageAliases
 * @param {GatsbyCache} cache
 */
function createHighlightDirectiveLineTransformer(languageCommentMap, languageAliases, cache) {
  let grammarCache;
  /** @type {LineTransformer<HighlightCommentTransfomerState>} */
  const transformer = async ({ line, language, state }) => {
    if (!grammarCache) {
      grammarCache = await cache.get('grammars');
    }

    const scope = getScope(language, grammarCache, languageAliases);
    const commentWrapper = getCommentForLanguage(language, scope, languageCommentMap);
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
        state,
        data: { isHighlighted: true }
      };
    }
    if (state && state.highlightNextLine) {
      // return unchanged text, attrs with added class name, and state with highlightNextLine set
      // to false but preserve inHighlightRange so that a misplaced 'highlight-next-line'
      // doesn't disrupt a highlight range
      return {
        line: highlightLine(line),
        state: { ...state, highlightNextLine: false },
        data: { isHighlighted: true }
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
