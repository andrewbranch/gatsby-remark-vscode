// @ts-check
const path = require('path');
const { getLanguageNames, requireJson, requirePlistOrJson, isRelativePath, readFile } = require('./utils');
const { highestBuiltinLanguageId } = require('./storeUtils');
const unzipDir = path.resolve(__dirname, '../lib/extensions');
let languageId = highestBuiltinLanguageId + 1;

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
          include: themeContents.include
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
 * @param {string} contextDir
 * @param {Host} host
 */
async function getExtensionPath(specifier, contextDir, host) {
  const absolute = path.isAbsolute(specifier) ? specifier :
    isRelativePath(specifier) ? path.normalize(path.join(contextDir, specifier)) :
    require.resolve(specifier);
  
  const ext = path.extname(absolute);
  if (ext.toLowerCase() === '.vsix' || ext.toLowerCase() === '.zip') {
    const outDir = path.join(unzipDir, path.basename(absolute, ext));
    await host.decompress(await readFile(absolute), outDir);
    return path.join(outDir, 'extension');
  }

  return absolute;
}

/**
 * @param {string[]} extensions
 * @param {string} contextDir
 * @param {Host} host
 * @param {*} cache
 */
function processExtensions(extensions, contextDir, host, cache) {
  return Promise.all(extensions.map(async extension => {
    const packageJsonPath = path.join(await getExtensionPath(extension, contextDir, host), 'package.json');
    const { grammars, themes } = await processExtension(packageJsonPath);
    Object.keys(grammars).forEach(scopeName => (grammars[scopeName].languageId = languageId++));
    await mergeCache(cache, 'grammars', grammars);
    await mergeCache(cache, 'themes', themes);
  }));
}

module.exports = { processExtension, processExtensions };
