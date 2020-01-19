// @ts-check
const fs = require('fs');
const util = require('util');
const zlib = require('zlib');
const path = require('path');
const JSON5 = require('json5');
const plist = require('plist');
const uniq = require('lodash.uniq');
const logger = require('loglevel');
const { declaration } = require('./renderers/css');
const { createHash } = require('crypto');

const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const exists = util.promisify(fs.exists);
const gunzip = util.promisify(zlib.gunzip);

/**
 * Splits a Visual Studio Marketplace extension identifier into publisher and extension name.
 * @param {string} identifier The unique identifier of a VS Code Marketplace extension in the format 'publisher.extension-name'.
 */
function parseExtensionIdentifier(identifier) {
  const [publisher, name] = identifier.split('.');
  if (!name) {
    throw new Error(`Extension identifier must be in format 'publisher.extension-name'.`);
  }

  return { publisher, name };
}

/**
 * Gets the absolute path to the download path of a downloaded extension.
 * @param {string} identifier
 * @param {string} extensionDir
 */
function getExtensionBasePath(identifier, extensionDir) {
  return path.join(extensionDir, identifier);
}

/**
 * Gets the absolute path to the data directory of a downloaded extension.
 * @param {string} identifier
 * @param {string} extensionDir
 */
function getExtensionPath(identifier, extensionDir) {
  return path.join(getExtensionBasePath(identifier, extensionDir), 'extension');
}

/**
 * Gets the package.json of an extension as a JavaScript object.
 * @param {string} identifier
 * @param {string} extensionDir
 * @returns {object}
 */
function getExtensionPackageJson(identifier, extensionDir) {
  return require(path.join(getExtensionPath(identifier, extensionDir), 'package.json'));
}

/**
 * Gets the array of language codes that can be used to set the language of a Markdown code fence.
 * @param {*} languageRegistration A 'contributes.languages' entry from an extension’s package.json.
 * @returns {string[]}
 */
function getLanguageNames(languageRegistration) {
  return uniq(
    [languageRegistration.id, ...(languageRegistration.aliases || []), ...(languageRegistration.extensions || [])].map(
      name => name.toLowerCase().replace(/[^a-z0-9_+#-]/g, '')
    )
  );
}

/**
 * Strips special characters, replaces space with dashes, and lowercases a string.
 * @param {string} str
 */
function sanitizeForClassName(str) {
  return str
    .replace(/\s+/g, '-')
    .replace(/[^-_a-z0-9]/gi, '')
    .toLowerCase();
}

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
 * @template T
 * @template U
 * @param {T[]} arr
 * @param {(element: T) => U | U[]} mapper
 * @returns {U[]}
 */
function flatMap(arr, mapper) {
  /** @type {U[]} */
  const flattened = [];
  for (const input of arr) {
    const mapped = mapper(input);
    if (Array.isArray(mapped)) {
      for (const output of mapped) {
        flattened.push(output);
      }
    } else {
      flattened.push(mapped);
    }
  }
  return flattened;
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
 * @returns {ThemeOption}
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

function createOnce() {
  const onceReturns = new Map();
  /**
   * @template {void | Promise<void>} T
   * @param {() => T} fn
   * @param {any=} key
   * @returns {T | undefined}
   */
  return function once(fn, key = fn) {
    if (!onceReturns.has(key)) {
      const ret = fn();
      onceReturns.set(key, ret);
      return ret;
    }
    return onceReturns.get(key);
  };
}

function deprecationNotice(message) {
  logger.warn(`Deprecation notice: ${message}`);
}

/**
 * @param {string} p
 */
function isRelativePath(p) {
  return /^\.\.?[\\/]/.test(p);
}

const requireJson = /** @param {string} pathName */ pathName => JSON5.parse(fs.readFileSync(pathName, 'utf8'));
const requirePlistOrJson = /** @param {string} pathName */ async pathName =>
  path.extname(pathName) === '.json' ? requireJson(pathName) : plist.parse(await readFile(pathName, 'utf8'));

module.exports = {
  readFile,
  readdir,
  exists,
  gunzip,
  parseExtensionIdentifier,
  getExtensionPath,
  getExtensionBasePath,
  getExtensionPackageJson,
  getLanguageNames,
  sanitizeForClassName,
  requireJson,
  requirePlistOrJson,
  getThemePrefixedTokenClassName,
  getThemeClassName,
  getThemeClassNames,
  flatMap,
  concatConditionalThemes,
  groupConditions,
  getStylesFromThemeSettings,
  convertLegacyThemeOption,
  deprecationNotice,
  isRelativePath,
  createOnce
};
