// @ts-check
const fs = require('fs');
const json = require('comment-json');
const plist = require('plist');
const util = require('util');
const glob = require('glob');
const path = require('path');
const { getLanguageNames } = require('../src/utils');

const copyFile = util.promisify(fs.copyFile);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const tryMkdir = /** @param {string} pathName */ pathName => { try { return fs.mkdirSync(pathName) } catch (_) { return null; } };
const requireJson = pathName => json.parse(fs.readFileSync(pathName, 'utf8'));

const grammarDestDir = path.resolve(__dirname, '../lib/grammars');
const themeDestDir = path.resolve(__dirname, '../lib/themes');
const grammarPath = /** @param {string} basename */ basename => path.join(grammarDestDir, basename);
const themePath = /** @param {string} basename */ basename => path.join(themeDestDir, basename);
let languageId = 1;

glob(path.resolve(__dirname, '../vscode/extensions/**/package.json'), async (err, packages) => {
  try {
    if (err) throw err;
    // Copy langauges
    await tryMkdir(grammarDestDir);
    const manifest = await Promise.all(packages.map(async packageJsonPath => {
      const packageJson = requireJson(packageJsonPath);
      if (packageJson.contributes && packageJson.contributes.grammars) {
        return Promise.all(packageJson.contributes.grammars.map(async grammar => {
          const sourcePath = path.resolve(path.dirname(packageJsonPath), grammar.path);
          const content = path.extname(sourcePath) === '.json'
            ? requireJson(sourcePath)
            : plist.parse(await readFile(sourcePath, 'utf8'));
            const { scopeName } = content;
          const destPath = grammarPath(path.basename(sourcePath));
          const languageRegistration = packageJson.contributes.languages.find(l => l.id === grammar.language);
          const newContent = processTmJson(content);
          if (newContent === content) {
            await copyFile(sourcePath, destPath);
          } else {
            await writeFile(destPath, JSON.stringify(newContent, null, 2));
          }

          return {
            scopeName,
            destPath,
            tokenTypes: grammar.tokenTypes,
            embeddedLanguages: grammar.embeddedLanguages,
            languageNames: languageRegistration ? getLanguageNames(languageRegistration) : [],
          };
        }));
      }
    }));

    await writeFile(
      grammarPath('manifest.json'),
      JSON.stringify(manifest.reduce((hash, grammars) => grammars ? ({
        ...hash,
        ...grammars.reduce((hash, grammar) => grammar ? ({
          ...hash,
          [grammar.scopeName]: {
            path: path.basename(grammar.destPath),
            tokenTypes: grammar.tokenTypes,
            embeddedLanguages: grammar.embeddedLanguages,
            languageNames: grammar.languageNames,
            languageId: languageId++,
          },
        }) : hash, {}),
      }) : hash, {}), null, 2));

    // Copy themes
    await tryMkdir(themeDestDir);
    const themeManifest = await Promise.all(packages.map(async packageJsonPath => {
      const packageJson = requireJson(packageJsonPath);
      if (packageJson.contributes && packageJson.contributes.themes) {
        return Promise.all(packageJson.contributes.themes.map(async theme => {
          const sourcePath = path.resolve(path.dirname(packageJsonPath), theme.path);
          const destPath = themePath(path.basename(theme.path));
          const themeContents = requireJson(sourcePath);
          await copyFile(sourcePath, destPath);
          if (themeContents.include) {
            await copyFile(
              path.resolve(path.dirname(sourcePath), themeContents.include),
              themePath(path.basename(themeContents.include)));
          }

          return {
            id: theme.id || path.basename(theme.path).split('.')[0],
            path: path.basename(destPath),
            label: theme.label
          };
        }));
      }
    }));

    const flattenedManifest = themeManifest.reduce((hash, themes) => themes ? ({
      ...hash,
      ...themes.reduce((hash, theme) => ({
        ...hash,
        [theme.id]: theme,
      }), {}),
    }) : hash, {});

    await writeFile(
      themePath('manifest.json'),
      JSON.stringify(flattenedManifest, null, '  '));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

// Copy themes
glob(path.resolve(__dirname, '../vscode/extensions/**/package.json'), async (err, packages) => {
  try {
    if (err) throw err;
    
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

/**
 * @param {*} content JSON content of a tmLanguage file
 */
function processTmJson(content) {
  // This one file tries to include like every language including ones that aren’t built into
  // VS Code, and I doubt anybody wants to syntax highlight whatever “heredoc” is on their blog,
  // so let’s just remove it.
  if (content.scopeName === 'source.shell' && content.repository && content.repository.heredoc) {
    return {
      ...content,
      repository: {
        ...content.repository,
        heredoc: {
          patterns: [],
        },
      },
    };
  }
  return content;
}