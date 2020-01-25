const tokenizeWithTheme = require('./tokenizeWithTheme');
const { getTransformedLines } = require('./transformers');
const { getGrammar } = require('./storeUtils');

/**
 * @template TKey
 * @param {CodeBlockRegistry<TKey>} codeBlockRegistry
 * @param {TKey} registryKey
 * @param {ConditionalTheme[]} possibleThemes
 * @param {() => Promise<[import('vscode-textmate').Registry, () => void]>} getTextMateRegistry
 * @param {LineTransformer[]} lineTransformers
 * @param {string} scope
 * @param {string} text
 * @param {string | undefined} languageName
 * @param {any} meta
 * @param {GatsbyCache} cache
 */
async function registerCodeBlock(
  codeBlockRegistry,
  registryKey,
  possibleThemes,
  getTextMateRegistry,
  lineTransformers,
  scope,
  text,
  languageName,
  meta,
  cache
) {
  const grammarCache = await cache.get('grammars');
  const [registry, unlockRegistry] = await getTextMateRegistry();
  try {
    const lines = getTransformedLines(lineTransformers, text, languageName, meta);
    /** @type {import('vscode-textmate').ITokenTypeMap} */
    let tokenTypes = {};
    /** @type {number} */
    let languageId;

    if (scope) {
      const grammarData = getGrammar(scope, grammarCache);
      languageId = grammarData.languageId;
      tokenTypes = grammarData.tokenTypes;
    }

    const grammar = languageId && (await registry.loadGrammarWithConfiguration(scope, languageId, { tokenTypes }));
    codeBlockRegistry.register(registryKey, {
      lines,
      text,
      meta,
      languageName,
      possibleThemes,
      isTokenized: !!grammar,
      tokenizationResults: possibleThemes.map(theme => tokenizeWithTheme(lines, theme, grammar, registry))
    });
  } finally {
    unlockRegistry();
  }
}

module.exports = registerCodeBlock;
