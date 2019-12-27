// @ts-check
const path = require('path');
const { getLanguageNames, requireJson, requirePlistOrJson, exists, readFile } = require('./utils');
const { getHighestBuiltinLanguageId } = require('./storeUtils');
const unzipDir = path.resolve(__dirname, '../lib/extensions');

/**
 * @param {string} packageJsonPath
 */
async function processExtension(packageJsonPath) {
  const packageJson = requireJson(packageJsonPath);
  let grammars = {};
  let themes = {};
  if (packageJson.contributes && packageJson.contributes.grammars) {
    const manifest = await Promise.all(
      packageJson.contributes.grammars.map(async grammar => {
        const sourcePath = path.resolve(path.dirname(packageJsonPath), grammar.path);
        const content = await requirePlistOrJson(sourcePath);
        const { scopeName } = content;
        const languageRegistration = packageJson.contributes.languages.find(l => l.id === grammar.language);

        return {
          scopeName,
          path: sourcePath,
          tokenTypes: grammar.tokenTypes,
          embeddedLanguages: grammar.embeddedLanguages,
          injectTo: grammar.injectTo,
          languageNames: languageRegistration ? getLanguageNames(languageRegistration) : []
        };
      })
    );

    grammars = manifest.reduce(
      (hash, grammar) => ({
        ...hash,
        [grammar.scopeName]: {
          path: grammar.path,
          tokenTypes: grammar.tokenTypes,
          embeddedLanguages: grammar.embeddedLanguages,
          injectTo: grammar.injectTo,
          languageNames: grammar.languageNames
        }
      }),
      {}
    );
  }

  if (packageJson.contributes && packageJson.contributes.themes) {
    const manifest = await Promise.all(
      packageJson.contributes.themes.map(async theme => {
        const sourcePath = path.resolve(path.dirname(packageJsonPath), theme.path);
        const themeContents = await requirePlistOrJson(sourcePath);
        return {
          id: theme.id || path.basename(theme.path).split('.')[0],
          path: sourcePath,
          label: theme.label,
          include: themeContents.include,
          packageName: packageJson.name,
          isOnlyThemeInPackage: packageJson.contributes.themes.length === 1
        };
      })
    );

    themes = manifest.reduce(
      (hash, theme) => ({
        ...hash,
        [theme.id]: theme
      }),
      {}
    );
  }

  return { grammars, themes };
}

/**
 * @param {*} cache
 * @param {string} key
 * @param {object} value
 */
async function mergeCache(cache, key, value) {
  await cache.set(key, { ...(await cache.get(key)), ...value });
}

/**
 * @param {string} specifier
 * @param {Host} host
 */
async function getExtensionPackageJsonPath(specifier, host) {
  const absolute = path.isAbsolute(specifier) ? specifier : require.resolve(path.join(specifier, 'package.json'));
  const ext = path.extname(absolute);
  if (ext.toLowerCase() === '.vsix' || ext.toLowerCase() === '.zip') {
    const outDir = path.join(unzipDir, path.basename(absolute, ext));
    await host.decompress(await readFile(absolute), unzipDir);
    if (await exists(path.join(absolute, 'extension', 'package.json'))) {
      return path.join(outDir, 'extension', 'package.json');
    }
    return path.join(outDir, 'package.json');
  }

  return absolute;
}

/**
 * @param {string[]} extensions
 * @param {Host} host
 * @param {*} cache
 */
function processExtensions(extensions, host, cache) {
  let languageId = getHighestBuiltinLanguageId() + 1;
  return Promise.all(
    extensions.map(async extension => {
      const packageJsonPath = await getExtensionPackageJsonPath(extension, host);
      const { grammars, themes } = await processExtension(packageJsonPath);
      Object.keys(grammars).forEach(scopeName => (grammars[scopeName].languageId = languageId++));
      await mergeCache(cache, 'grammars', grammars);
      await mergeCache(cache, 'themes', themes);
    })
  );
}

module.exports = { processExtension, processExtensions };
