const setup = require('../setup');
const plugin = require('../../index');
const { registerCodeBlock } = require('../registerCodeNode');
const parseCodeFenceHeader = require('../parseCodeFenceInfo');
const createCodeNodeRegistry = require('../createCodeNodeRegistry');
const getCodeBlockDataFromRegistry = require('./getCodeBlockDataFromRegistry');
const getThemes = require('./getThemes');
const { createHash } = require('crypto');
const { getScope } = require('../storeUtils');
/** @type {{ type: 'code' }} */
const registryKey = { type: 'code' };

/**
 * @param {grvsc.gql.HighlightArgs} args
 * @param {PluginOptions} pluginOptions
 * @param {{ cache: GatsbyCache, createNodeId: (key: string) => string}} pluginArguments
 * @returns {Promise<grvsc.gql.GRVSCCodeBlock>}
 */
async function highlight(args, pluginOptions, { cache, createNodeId }) {
  const { theme, languageAliases, getLineTransformers, getLineClassName, wrapperClassName, ...rest } = await setup(
    pluginOptions,
    '',
    cache,
    plugin.once
  );

  const lineTransformers = getLineTransformers(
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
  /** @type {CodeNodeRegistry<typeof registryKey>} */
  const codeNodeRegistry = createCodeNodeRegistry({ prefixAllClassNames: true });
  const meta = parseCodeFenceHeader(args.language, args.meta);

  await registerCodeBlock(
    codeNodeRegistry,
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
  codeNodeRegistry.forEachCodeBlock(codeBlock => {
    result = getCodeBlockDataFromRegistry(
      codeNodeRegistry,
      registryKey,
      codeBlock,
      getWrapperClassName,
      getLineClassName
    );

    function getWrapperClassName() {
      return typeof wrapperClassName === 'function'
        ? wrapperClassName({
            language: codeBlock.languageName,
            node: undefined,
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
