const tokenizeWithTheme = require('./tokenizeWithTheme');
const { getTransformedLines } = require('./transformers');
const { getGrammar } = require('./storeUtils');
const { joinClassNames } = require('./renderers/css');
const { uniq } = require('./utils');

/**
 * @template {Keyable} TKey
 * @param {CodeNodeRegistry<TKey>} codeBlockRegistry
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
    const lines = await getTransformedLines(lineTransformers, text, languageName, meta);
    /** @type {import('vscode-textmate').ITokenTypeMap} */
    let tokenTypes = {};
    /** @type {number} */
    let languageId;

    if (scope) {
      const grammarData = getGrammar(scope, grammarCache);
      languageId = grammarData.languageId;
      tokenTypes = grammarData.tokenTypes;
    }

    const addedClassNames = joinClassNames(...uniq(lines.map(l => l.setContainerClassName)));
    const grammar = languageId && (await registry.loadGrammarWithConfiguration(scope, languageId, { tokenTypes }));
    codeBlockRegistry.register(registryKey, {
      lines,
      text,
      meta,
      languageName,
      possibleThemes,
      isTokenized: !!grammar,
      tokenizationResults: possibleThemes.map(theme => tokenizeWithTheme(lines, theme, grammar, registry)),
      className: addedClassNames || undefined
    });
  } finally {
    unlockRegistry();
  }
}

/**
 * @template {Keyable} TKey
 * @param {CodeNodeRegistry<TKey>} codeBlockRegistry
 * @param {TKey} registryKey
 * @param {ConditionalTheme[]} possibleThemes
 * @param {() => Promise<[import('vscode-textmate').Registry, () => void]>} getTextMateRegistry
 * @param {string} scope
 * @param {string} text
 * @param {string | undefined} languageName
 * @param {GatsbyCache} cache
 */
async function registerCodeSpan(
  codeBlockRegistry,
  registryKey,
  possibleThemes,
  getTextMateRegistry,
  scope,
  text,
  languageName,
  cache
) {
  const grammarCache = await cache.get('grammars');
  const [registry, unlockRegistry] = await getTextMateRegistry();
  try {
    /** @type {Line[]} */
    const lines = [{ text, data: {}, attrs: {}, gutterCells: [] }];
    const { tokenTypes, languageId } = getGrammar(scope, grammarCache);
    const grammar = await registry.loadGrammarWithConfiguration(scope, languageId, { tokenTypes });
    codeBlockRegistry.register(registryKey, {
      lines,
      text,
      meta: {},
      languageName,
      possibleThemes,
      isTokenized: true,
      tokenizationResults: possibleThemes.map(theme => tokenizeWithTheme(lines, theme, grammar, registry))
    });
  } finally {
    unlockRegistry();
  }
}

module.exports = { registerCodeBlock, registerCodeSpan };
