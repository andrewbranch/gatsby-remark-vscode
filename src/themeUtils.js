const { createHash } = require('crypto');
const { declaration } = require('./renderers/css');
const { sanitizeForClassName } = require('./utils');
const { ensureThemeLocation } = require('./storeUtils');
const { loadColorTheme } = require('../lib/vscode/colorThemeData');

/**
 * @param {string} themeIdentifier
 */
function getThemeHash(themeIdentifier) {
  return createHash('md5')
    .update(themeIdentifier)
    .digest('base64')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .substr(0, 5);
}

/**
 * @param {string} canonicalClassName
 * @param {string} themeIdentifier
 */
function getThemePrefixedTokenClassName(canonicalClassName, themeIdentifier) {
  return 'grvsc-t' + getThemeHash(themeIdentifier) + '-' + canonicalClassName.substr('mtk'.length);
}

/**
 * @param {ConditionalTheme} theme
 * @returns {string[]}
 */
function getThemeClassNames(theme) {
  return theme.conditions.map(({ condition }) => getThemeClassName(theme.identifier, condition));
}

/**
 *
 * @param {string} themeIdentifier
 * @param {ThemeCondition['condition']} conditionKind
 */
function getThemeClassName(themeIdentifier, conditionKind) {
  switch (conditionKind) {
    case 'default':
      return sanitizeForClassName(themeIdentifier);
    case 'matchMedia':
      return 'grvsc-mm-t' + getThemeHash(themeIdentifier);
    case 'parentSelector':
      return 'grvsc-ps-t' + getThemeHash(themeIdentifier);
    default:
      throw new Error(`Unrecognized theme condition '${conditionKind}'`);
  }
}

/**
 * @param {ConditionalTheme[] | undefined} arr1
 * @param {ConditionalTheme[]} arr2
 * @returns {ConditionalTheme[]}
 */
function concatConditionalThemes(arr1, arr2) {
  if (!arr1) arr1 = [];
  arr2.forEach(addTheme);
  return arr1;

  /** @param {ConditionalTheme} theme */
  function addTheme(theme) {
    const existing = arr1.find(t => t.identifier === theme.identifier);
    if (existing) {
      if (conditionalThemesAreEqual(existing, theme)) return;
      existing.conditions = concatConditions(existing.conditions, theme.conditions);
    } else {
      arr1 = arr1.concat(theme);
    }
  }
}

/**
 * @param {string} identifier
 * @param {ThemeCache} themeCache
 * @param {string=} contextDirectory
 * @returns {Promise<ConditionalTheme>}
 */
async function createDefaultTheme(identifier, themeCache, contextDirectory) {
  return {
    identifier,
    path: await ensureThemeLocation(identifier, themeCache, contextDirectory),
    conditions: [{ condition: 'default' }]
  };
}

/**
 * @param {string} identifier
 * @param {string} match
 * @param {ThemeCache} themeCache
 * @param {string=} contextDirectory
 * @returns {Promise<ConditionalTheme>}
 */
async function createMatchMediaTheme(identifier, match, themeCache, contextDirectory) {
  return {
    identifier,
    path: await ensureThemeLocation(identifier, themeCache, contextDirectory),
    conditions: [{ condition: 'matchMedia', value: match }]
  };
}

/**
 * @param {string} identifier
 * @param {string} parentSelector
 * @param {ThemeCache} themeCache
 * @param {string=} contextDirectory
 * @returns {Promise<ConditionalTheme>}
 */
async function createParentSelectorTheme(identifier, parentSelector, themeCache, contextDirectory) {
  return {
    identifier,
    path: await ensureThemeLocation(identifier, themeCache, contextDirectory),
    conditions: [{ condition: 'parentSelector', value: parentSelector }]
  };
}

/**
 * @param {ThemeCondition[]} arr1
 * @param {ThemeCondition[]} arr2
 */
function concatConditions(arr1, arr2) {
  arr2.forEach(addCondition);
  return arr1;

  /** @param {ThemeCondition} condition */
  function addCondition(condition) {
    if (!arr1.some(c => !compareConditions(c, condition))) {
      arr1 = arr1.concat(condition);
    }
  }
}

/**
 * @param {ConditionalTheme} a
 * @param {ConditionalTheme} b
 */
function conditionalThemesAreEqual(a, b) {
  if (a.identifier !== b.identifier) return false;
  if (a.conditions.length !== b.conditions.length) return false;
  const aConditions = sortConditions(a.conditions);
  const bConditions = sortConditions(b.conditions);
  for (let i = 0; i < aConditions.length; i++) {
    if (compareConditions(aConditions[i], bConditions[i])) {
      return false;
    }
  }
  return true;
}

/**
 * @param {ThemeCondition[]} conditions
 */
function sortConditions(conditions) {
  return conditions.slice().sort(compareConditions);
}

/**
 * @param {ThemeCondition} a
 * @param {ThemeCondition} b
 */
function compareConditions(a, b) {
  if (a.condition < b.condition) return -1;
  if (a.condition > b.condition) return 1;
  switch (a.condition) {
    case 'matchMedia':
      // @ts-ignore
      const bValue = b.value;
      if (a.value < bValue) return -1;
      if (a.value > bValue) return 1;
  }
  return 0;
}

/**
 * @param {ThemeCondition[]} conditions
 */
function groupConditions(conditions) {
  return {
    default: conditions.find(/** @returns {c is DefaultThemeCondition} */ c => c.condition === 'default'),
    matchMedia: conditions.filter(/** @returns {c is MatchMediaThemeCondition} */ c => c.condition === 'matchMedia'),
    parentSelector: conditions.filter(
      /** @returns {c is ParentSelectorThemeCondition} */ c => c.condition === 'parentSelector'
    )
  };
}

const settingPropertyMap = { 'editor.background': 'background-color', 'editor.foreground': 'color' };

/**
 * @param {Record<string, string>} settings
 * @returns {grvsc.CSSDeclaration[]}
 */
function getStylesFromThemeSettings(settings) {
  /** @type {grvsc.CSSDeclaration[]} */
  const decls = [];
  for (const key in settings) {
    const property = settingPropertyMap[key];
    if (property) {
      decls.push(declaration(property, settings[key]));
    }
  }
  return decls;
}

/**
 * @param {LegacyThemeOption} themeOption
 * @returns {ThemeOption<CodeBlockData>}
 */
function convertLegacyThemeOption(themeOption) {
  if (typeof themeOption === 'function') {
    return data => convertLegacyThemeSettings(themeOption(data));
  }
  return convertLegacyThemeSettings(themeOption);
}

/**
 * @param {LegacyThemeSettings | string} themeSettings
 * @returns {ThemeSettings | string}
 */
function convertLegacyThemeSettings(themeSettings) {
  if (typeof themeSettings === 'string') {
    return themeSettings;
  }

  /** @type {MediaQuerySetting[]} */
  const media = [];
  if (themeSettings.prefersDarkTheme) {
    media.push({ match: '(prefers-color-scheme: dark)', theme: themeSettings.prefersDarkTheme });
  }
  if (themeSettings.prefersLightTheme) {
    media.push({ match: '(prefers-color-scheme: light)', theme: themeSettings.prefersLightTheme });
  }

  return {
    default: themeSettings.defaultTheme,
    media
  };
}

/**
 * @param {string} themePath
 * @returns {RawTheme}
 */
function loadTheme(themePath) {
  const { resultRules: tokenColors, resultColors: settings } = loadColorTheme(themePath);
  const defaultTokenColors = {
    settings: {
      foreground: settings['editor.foreground'] || settings.foreground,
      background: settings['editor.background'] || settings.background
    }
  };
  return { settings: [defaultTokenColors, ...tokenColors], resultColors: settings };
}

module.exports = {
  getThemePrefixedTokenClassName,
  getThemeClassName,
  getThemeClassNames,
  concatConditionalThemes,
  groupConditions,
  getStylesFromThemeSettings,
  convertLegacyThemeOption,
  createDefaultTheme,
  createMatchMediaTheme,
  createParentSelectorTheme,
  loadTheme
};
