// @ts-check
const { loadColorTheme } = require('../lib/vscode/colorThemeData');
const { generateTokensCSSForColorMap } = require('../lib/vscode/tokenization');
const { ensureThemeLocation } = require('./storeUtils');
const { sanitizeForClassName } = require('./utils');
const {
  joinClassNames,
  renderRule,
  prefersDark,
  prefersLight,
  prefixRules
} = require('./renderUtils');

/**
 * @param {ColorThemeSettings} settings
 * @returns {{ [K in keyof ColorThemeSettings]: string }}
 */
function createThemeClassNames(settings) {
  return {
    defaultTheme: sanitizeForClassName(settings.defaultTheme),
    prefersDarkTheme: settings.prefersDarkTheme && `pd--${sanitizeForClassName(settings.prefersDarkTheme)}`,
    prefersLightTheme: settings.prefersLightTheme && `pl--${sanitizeForClassName(settings.prefersLightTheme)}`
  };
}

/**
 * @param {{ [K in keyof ColorThemeSettings]: string }} classNames
 */
function joinThemeClassNames(classNames) {
  return joinClassNames(...Object.keys(classNames).map(setting => classNames[setting]));
}

/**
 * @param {string | ColorThemeSettings} colorThemeValue
 * @returns {ColorThemeSettings}
 */
function createColorThemeSettings(colorThemeValue) {
  return typeof colorThemeValue === 'string' ? { defaultTheme: colorThemeValue } : colorThemeValue;
}

const settingPropertyMap = { 'editor.background': 'background-color', 'editor.foreground': 'color' };

/**
 * @param {Record<string, string>} settings
 */
function getStylesFromSettings(settings) {
  return Object.keys(settings)
    .reduce((styles, setting) => {
      const property = settingPropertyMap[setting];
      if (property) {
        return [...styles, `${property}: ${settings[setting]};`];
      }
      return styles;
    }, [])
    .join('\n');
}

/**
 * @param {{
 *  colorTheme: PluginOptions['colorTheme'],
 *  replaceColor: PluginOptions['replaceColor'],
 *  registry: import('vscode-textmate').Registry,
 *  cache: any,
 *  markdownNode: any,
 *  codeFenceNode: any,
 *  codeFenceOptions: object,
 *  languageName: string,
 *  scopeName: string,
 *  stylesheets: Record<string, string>
 * }} options
 * @returns {Promise<string>}
 */
async function createThemeStyles({
  colorTheme,
  replaceColor,
  registry,
  markdownNode,
  codeFenceNode,
  codeFenceOptions,
  languageName,
  scopeName,
  cache,
  stylesheets
}) {
  const colorThemeValue =
    typeof colorTheme === 'function'
      ? colorTheme({
          markdownNode,
          codeFenceNode,
          parsedOptions: codeFenceOptions,
          language: languageName
        })
      : colorTheme;
  const colorThemeSettings = createColorThemeSettings(colorThemeValue);
  const themeClassNames = createThemeClassNames(colorThemeSettings);
  for (const setting in colorThemeSettings) {
    const colorThemeIdentifier = colorThemeSettings[setting];
    if (!colorThemeIdentifier) continue;

    const themeClassName = themeClassNames[setting];
    const themeCache = await cache.get('themes');
    const colorThemePath = await ensureThemeLocation(colorThemeIdentifier, themeCache, markdownNode.fileAbsolutePath);

    const { resultRules: tokenColors, resultColors: settings } = loadColorTheme(colorThemePath);
    const defaultTokenColors = {
      settings: {
        foreground: settings['editor.foreground'] || settings.foreground,
        background: settings['editor.background'] || settings.background
      }
    };

    registry.setTheme({ settings: [defaultTokenColors, ...tokenColors] });
    if (!stylesheets[themeClassName] || scopeName) {
      const rules = [
        renderRule(themeClassName, getStylesFromSettings(settings)),
        ...(scopeName
          ? prefixRules(
              generateTokensCSSForColorMap(
                registry.getColorMap().map(color => replaceColor(color, colorThemeIdentifier))
              ).split('\n'),
              `.${themeClassName} `
            )
          : [])
      ];

      if (setting === 'prefersDarkTheme') {
        stylesheets[themeClassName] = prefersDark(rules);
      } else if (setting === 'prefersLightTheme') {
        stylesheets[themeClassName] = prefersLight(rules);
      } else {
        stylesheets[themeClassName] = rules.join('\n');
      }
    }
  }

  return joinThemeClassNames(themeClassNames);
}

module.exports = createThemeStyles;
