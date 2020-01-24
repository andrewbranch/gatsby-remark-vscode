const setup = require('../setup');
const plugin = require('../../index');
const getPossibleThemes = require('../getPossibleThemes');
const registerCodeBlock = require('../registerCodeBlock');
const parseCodeFenceHeader = require('../parseCodeFenceHeader');
const createCodeBlockRegistry = require('../createCodeBlockRegistry');
const getCodeBlockDataFromRegistry = require('./getCodeBlockDataFromRegistry');
const { ensureThemeLocation, getScope } = require('../storeUtils');
const { createDefaultTheme, concatConditionalThemes } = require('../themeUtils');
const parseThemeCondition = require('./parseThemeCondition');
const registryKey = 0;

/**
 * @param {grvsc.gql.GRVSCThemeArgument} theme
 * @param {any} themeCache
 * @returns {Promise<ConditionalTheme>}
 */
async function convertThemeArgument(theme, themeCache) {
  return {
    identifier: theme.identifier,
    path: await ensureThemeLocation(theme.identifier, themeCache, undefined),
    conditions: theme.conditions.map(parseThemeCondition)
  };
}

/**
 * @param {ThemeOption} themeOption
 * @param {grvsc.gql.HighlightArgs} args
 * @param {any} themeCache
 * @returns {Promise<ConditionalTheme[]>}
 */
async function getThemes(themeOption, args, themeCache) {
  if (args.defaultTheme) {
    const defaultTheme = await createDefaultTheme(args.defaultTheme, themeCache);
    const additionalThemes = args.additionalThemes
      ? await Promise.all(args.additionalThemes.map(t => convertThemeArgument(t, themeCache)))
      : [];
    return concatConditionalThemes([defaultTheme], additionalThemes);
  }
  if (args.additionalThemes) {
    throw new Error(`Must provide a 'defaultTheme' if 'additionalThemes' are provided.`);
  }
  if (typeof themeOption === 'function') {
    throw new Error(
      `When plugin option 'theme' is a function, GraphQL resolver 'grvscHighlight' must supply a 'defaultTheme' argument. ` +
        `The 'theme' function will not be called while evaluating 'grvscHighlight'.`
    );
  }
  return getPossibleThemes(themeOption, themeCache, undefined, undefined, undefined, undefined, undefined);
}

/**
 * @param {grvsc.gql.HighlightArgs} args
 * @param {PluginOptions} pluginOptions
 * @param {{ cache: GatsbyCache, createNodeId: (key: string) => string}} pluginArguments
 */
async function highlight(args, pluginOptions, { cache, createNodeId }) {
  const {
    theme,
    languageAliases,
    getLineTransformers,
    getLineClassName,
    wrapperClassName,
    ...rest
  } = await plugin.once(() => setup(pluginOptions, cache));

  const lineTransformers = getLineTransformers({
    theme,
    languageAliases,
    getLineClassName,
    wrapperClassName,
    ...rest
  });

  const themeCache = await cache.get('themes');
  const grammarCache = await cache.get('grammars');
  const possibleThemes = await getThemes(theme, args, themeCache);
  const scope = getScope(args.language, grammarCache, languageAliases);
  /** @type {CodeBlockRegistry<typeof registryKey>} */
  const codeBlockRegistry = createCodeBlockRegistry();
  const meta = parseCodeFenceHeader(args.language, args.meta);

  await registerCodeBlock(
    codeBlockRegistry,
    registryKey,
    possibleThemes,
    () => plugin.getRegistry(cache, scope),
    lineTransformers,
    scope,
    args.source,
    args.language,
    meta,
    cache
  );

  /** @type {grvsc.gql.GRVSCCodeBlock} */
  let result;
  codeBlockRegistry.forEachCodeBlock(codeBlock => {
    result = getCodeBlockDataFromRegistry(
      codeBlockRegistry,
      registryKey,
      codeBlock,
      getWrapperClassName,
      getLineClassName,
      () => createNodeId(`GRVSCCodeBlock-Highlight`)
    );

    function getWrapperClassName() {
      return typeof wrapperClassName === 'function'
        ? wrapperClassName({
            language: codeBlock.languageName,
            markdownNode: undefined,
            codeFenceNode: undefined,
            parsedOptions: codeBlock.meta
          })
        : wrapperClassName;
    }
  });

  return result;
}

module.exports = highlight;
