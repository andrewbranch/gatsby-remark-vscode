const setup = require('../setup');
const plugin = require('../../index');
const registerCodeBlock = require('../registerCodeBlock');
const parseCodeFenceHeader = require('../parseCodeFenceHeader');
const createCodeBlockRegistry = require('../createCodeBlockRegistry');
const getCodeBlockDataFromRegistry = require('./getCodeBlockDataFromRegistry');
const getThemes = require('./getThemes');
const { createHash } = require('crypto');
const { getScope } = require('../storeUtils');
const registryKey = 0;

/**
 * @param {grvsc.gql.HighlightArgs} args
 * @param {PluginOptions} pluginOptions
 * @param {{ cache: GatsbyCache, createNodeId: (key: string) => string}} pluginArguments
 * @returns {Promise<grvsc.gql.GRVSCCodeBlock>}
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

  const lineTransformers = await getLineTransformers(
    {
      theme,
      languageAliases,
      getLineClassName,
      wrapperClassName,
      ...rest
    },
    cache
  );

  const themeCache = await cache.get('themes');
  const grammarCache = await cache.get('grammars');
  const possibleThemes = await getThemes(theme, args, themeCache);
  const scope = getScope(args.language, grammarCache, languageAliases);
  /** @type {CodeBlockRegistry<typeof registryKey>} */
  const codeBlockRegistry = createCodeBlockRegistry({ prefixAllClassNames: true });
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

  /** @type {Omit<grvsc.gql.GRVSCCodeBlock, 'id'>} */
  let result;
  codeBlockRegistry.forEachCodeBlock(codeBlock => {
    result = getCodeBlockDataFromRegistry(
      codeBlockRegistry,
      registryKey,
      codeBlock,
      getWrapperClassName,
      getLineClassName
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

  return {
    ...result,
    id: createNodeId('GRVSCCodeBlock-Highlight'),
    internal: {
      type: 'GRVSCCodeBlock',
      contentDigest: createHash('md5')
        .update(JSON.stringify(result))
        .digest('hex')
    }
  };
}

module.exports = highlight;
