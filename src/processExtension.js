// @ts-check
const path = require('path');
const { getLanguageNames, requireJson, requirePlistOrJson } = require('./utils');

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

module.exports = processExtension;
