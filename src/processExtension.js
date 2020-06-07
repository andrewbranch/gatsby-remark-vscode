// @ts-check
const path = require('path');
const process = require('process');
const logger = require('loglevel');
const {
  getLanguageNames,
  requireJson,
  requirePlistOrJson,
  exists,
  readFile,
  readdir,
  createRequire
} = require('./utils');
const { getHighestBuiltinLanguageId } = require('./storeUtils');
const unzipDir = path.resolve(__dirname, '../lib/extensions');
const requireMain = createRequire(require.main.filename);
const requireCwd = createRequire(path.join(process.cwd(), 'index.js'));

/**
 * @param {string} packageJsonPath
 */
async function processExtension(packageJsonPath) {
  const packageJson = requireJson(packageJsonPath);
  /** @type {Record<string, GrammarData>} */
  let grammars = {};
  /** @type {Record<string, ThemeData>} */
  let themes = {};
  if (packageJson.contributes && packageJson.contributes.grammars) {
    const manifest = await Promise.all(
      packageJson.contributes.grammars.map(
        /** @returns {Promise<GrammarData>} */ async grammar => {
          const sourcePath = path.resolve(path.dirname(packageJsonPath), grammar.path);
          const content = await requirePlistOrJson(sourcePath);
          const { scopeName } = content;
          const languageRegistration = packageJson.contributes.languages.find(l => l.id === grammar.language);
          const languageNames = languageRegistration ? getLanguageNames(languageRegistration) : [];
          logger.info(
            `Registering grammar '${scopeName}' from package ${packageJson.name} with language names: ${languageNames}`
          );

          return {
            languageId: 0, // Overwritten elsewhere
            scopeName,
            path: sourcePath,
            tokenTypes: toStandardTokenTypes(grammar.tokenTypes),
            embeddedLanguages: grammar.embeddedLanguages,
            injectTo: grammar.injectTo,
            languageNames
          };
        }
      )
    );

    grammars = manifest.reduce(
      (hash, grammar) => ({
        ...hash,
        [grammar.scopeName]: grammar
      }),
      {}
    );
  }

  if (packageJson.contributes && packageJson.contributes.themes) {
    const manifest = await Promise.all(
      packageJson.contributes.themes.map(
        /** @returns {Promise<ThemeData>} */ async theme => {
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
        }
      )
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
 * @param {GatsbyCache} cache
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
  const absolute = path.isAbsolute(specifier) ? specifier : requireResolveExtension(specifier);
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
 * We want to resolve the extension from the context of the user’s gatsby-config,
 * but this turns out to be difficult. Ideally, gatsby and this plugin are installed
 * in the same node_modules directory as the extension, but gatsby could be invoked
 * globally, and this plugin could be npm linked. If both of those things happen, we
 * can also try resolving from the current working directory. One of these will
 * probably always work.
 * @param {string} specifier
 */
function requireResolveExtension(specifier) {
  return (
    tryResolve(require) ||
    tryResolve(requireMain) ||
    tryResolve(requireCwd) ||
    require.resolve(path.join(specifier, 'package.json'))
  ); // If none work, throw the best error stack

  /** @param {NodeRequire} req */
  function tryResolve(req) {
    try {
      return req.resolve(path.join(specifier, 'package.json'));
    } catch (_) {
      return undefined;
    }
  }
}

/**
 * @param {string[]} extensions
 * @param {Host} host
 * @param {GatsbyCache} cache
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

/**
 * @param {Record<string, string> | undefined} tokenTypes
 * @returns {import('vscode-textmate').ITokenTypeMap}
 */
function toStandardTokenTypes(tokenTypes) {
  return (
    tokenTypes &&
    Object.keys(tokenTypes).reduce(
      (map, selector) => ({
        ...map,
        [selector]: toStandardTokenType(tokenTypes[selector])
      }),
      {}
    )
  );
}

/**
 * @param {string} tokenType
 * @returns {import('vscode-textmate').StandardTokenType}
 */
function toStandardTokenType(tokenType) {
  switch (tokenType.toLowerCase()) {
    case 'comment':
      return 1;
    case 'string':
      return 2;
    case 'regex':
      return 4;
    default:
      return 0;
  }
}

module.exports = { processExtension, processExtensions };
