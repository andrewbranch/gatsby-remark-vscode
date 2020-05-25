const fs = require('fs');
const path = require('path');
const setup = require('../setup');
const plugin = require('../../index');
const getThemes = require('./getThemes');
const { createHash } = require('crypto');
const { declaration, renderCSS } = require('../renderers/css');
const { loadTheme, getThemePrefixedTokenClassName } = require('../themeUtils');
const { createThemeCSSRules, boldDeclarations, italicDeclarations, underlineDeclarations } = require('../factory/css');
const styles = fs.readFileSync(path.resolve(__dirname, '../../styles.css'), 'utf8');

/**
 * @param {grvsc.gql.CSSArgs} args
 * @param {PluginOptions} pluginOptions
 * @param {{ cache: GatsbyCache, createNodeId: (key: string) => string}} pluginArguments
 * @returns {Promise<grvsc.gql.GRVSCStylesheet>}
 */
async function stylesheet(args, pluginOptions, { cache, createNodeId }) {
  const { theme, injectStyles, replaceColor } = await setup(pluginOptions, '', cache, plugin.once);
  const themeCache = await cache.get('themes');
  const possibleThemes = await getThemes(theme, args, themeCache);
  // Scope doesn’t matter
  const [tmRegistry, unlockRegistry] = await plugin.getRegistry(cache, 'source.js');
  /** @type {grvsc.CSSElement[]} */
  const cssElements = [];
  for (const theme of possibleThemes) {
    const rawTheme = loadTheme(theme.path);
    tmRegistry.setTheme(rawTheme);
    const colorMap = tmRegistry.getColorMap();
    const rules = [
      { className: getThemePrefixedTokenClassName('mtkb', theme.identifier), css: boldDeclarations },
      { className: getThemePrefixedTokenClassName('mtki', theme.identifier), css: italicDeclarations },
      { className: getThemePrefixedTokenClassName('mtku', theme.identifier), css: underlineDeclarations }
    ];
    for (let i = 1, color; i <= colorMap.length; i++, color = colorMap[i - 1]) {
      const canonicalClassName = `mtk${i}`;
      const className = getThemePrefixedTokenClassName(canonicalClassName, theme.identifier);
      rules.push({ className, css: [declaration('color', color)] });
    }
    cssElements.push(...createThemeCSSRules(theme, rawTheme.resultColors, rules, replaceColor));
  }

  unlockRegistry();
  let css = renderCSS(cssElements);
  if (injectStyles) {
    css += `\n\n${styles}`;
  }

  return {
    id: createNodeId(`GRVSCStylesheet-Stylesheet`),
    css,
    internal: {
      type: 'GRVSCCodeBlock',
      contentDigest: createHash('md5')
        .update(css)
        .digest('hex')
    }
  };
}

module.exports = stylesheet;
