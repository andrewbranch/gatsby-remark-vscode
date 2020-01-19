// @ts-check
const path = require('path');
const logger = require('loglevel');
const { getLanguageNames, requireJson, requirePlistOrJson, exists, readFile, readdir, createRequire } = require('./utils');
const { getHighestBuiltinLanguageId } = require('./storeUtils');
const unzipDir = path.resolve(__dirname, '../lib/extensions');
const requireMain = createRequire(require.main.filename);

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
        const languageNames = languageRegistration ? getLanguageNames(languageRegistration) : [];
        logger.info(
          `Registering grammar '${scopeName}' from package ${packageJson.name} with language names: ${languageNames}`
        );

        return {
          scopeName,
          path: sourcePath,
          tokenTypes: grammar.tokenTypes,
          embeddedLanguages: grammar.embeddedLanguages,
          injectTo: grammar.injectTo,
          languageNames
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
        const id = theme.id || path.basename(theme.path).split('.')[0];
        logger.info(`Registering theme '${theme.label || id}' from package ${packageJson.name}`);

        return {
          id,
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
  const absolute = path.isAbsolute(specifier) ? specifier : requireMain.resolve(path.join(specifier, 'package.json'));
  const ext = path.extname(absolute);
  if (ext.toLowerCase() === '.vsix' || ext.toLowerCase() === '.zip') {
    const outDir = path.join(unzipDir, path.basename(absolute, ext));
    await host.decompress(await readFile(absolute), outDir);
    return searchDirectory(outDir);
  }

  return absolute;

  async function searchDirectory(/** @type {string} */ dir, stop = false) {
    if (await exists(path.join(dir, 'extension', 'package.json'))) {
      return path.join(dir, 'extension', 'package.json');
    }
    if (await exists(path.join(dir, 'package.json'))) {
      return path.join(dir, 'package.json');
    }
    if (stop) {
      return;
    }

    for (const subdir of await readdir(dir, { withFileTypes: true })) {
      if (subdir.isDirectory) {
        const result = await searchDirectory(path.join(dir, subdir.name), true);
        if (result) {
          return result;
        }
      }
    }
  }
}

/**
 * @param {string[]} extensions
 * @param {Host} host
 * @param {*} cache
 */
async function processExtensions(extensions, host, cache) {
  let languageId = getHighestBuiltinLanguageId() + 1;
  for (const extension of extensions) {
    const packageJsonPath = await getExtensionPackageJsonPath(extension, host);
    const { grammars, themes } = await processExtension(packageJsonPath);
    Object.keys(grammars).forEach(scopeName => (grammars[scopeName].languageId = languageId++));
    await mergeCache(cache, 'grammars', grammars);
    await mergeCache(cache, 'themes', themes);
  }
}

module.exports = { processExtension, processExtensions };
