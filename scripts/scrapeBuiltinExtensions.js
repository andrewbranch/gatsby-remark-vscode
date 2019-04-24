// @ts-check
const fs = require('fs');
const util = require('util');
const glob = require('glob');
const path = require('path');
const processExtension = require('../src/processExtension');
const { requireGrammar } = require('../src/utils');

const copyFile = util.promisify(fs.copyFile);
const writeFile = util.promisify(fs.writeFile);
const exists = util.promisify(fs.exists);
const tryMkdir = /** @param {string} pathName */ pathName => { try { return fs.mkdirSync(pathName) } catch (_) { return null; } };

const grammarDestDir = path.resolve(__dirname, '../lib/grammars');
const themeDestDir = path.resolve(__dirname, '../lib/themes');
const grammarPath = /** @param {string} basename */ basename => path.join(grammarDestDir, basename);
const themePath = /** @param {string} basename */ basename => path.join(themeDestDir, basename);
let languageId = 0;

glob(path.resolve(__dirname, '../vscode/extensions/**/package.json'), async (err, packages) => {
  try {
    if (err) throw err;
    await tryMkdir(grammarDestDir);
    await tryMkdir(themeDestDir);
    const extensions = await Promise.all(packages.map(processExtension));
    
    // Copy langauges
    const grammarManifest = await extensions.reduce(async (newManifestPromise, extension) => {
      return {
        ...await newManifestPromise,
        ...await Object.keys(extension.grammars).reduce(async (newManifestPromise, scopeName) => {
          const grammar = extension.grammars[scopeName];
          const content = requireGrammar(grammar.path);
          let destPath = grammarPath(path.basename(grammar.path));
          const newContent = processTmJson(content);
          // Different languages are sometimes named the same thing
          languageId++;
          if (await exists(destPath)) {
            const existingGrammar = await requireGrammar(destPath);
            if (existingGrammar.scopeName !== scopeName) {
              const [baseName, ...ext] = path.basename(grammar.path).split('.');
              const renamed = [baseName, languageId, ...ext].join('.');
              destPath = grammarPath(renamed);
            }
          }
          if (newContent === content) {
            await copyFile(grammar.path, destPath);
          } else {
            await writeFile(destPath, JSON.stringify(newContent, null, 2));
          }

          return {
            ...await newManifestPromise,
            [scopeName]: {
              ...grammar,
              languageId,
              path: path.basename(destPath),
            },
          };
        }, Promise.resolve({})),
      };
    }, Promise.resolve({}));

    await writeFile(
      grammarPath('manifest.json'),
      JSON.stringify(grammarManifest, null, 2));

    // Copy themes
    const themeManifest = await extensions.reduce(async (newManifestPromise, extension) => {
      return {
        ...await newManifestPromise,
        ...await Object.keys(extension.themes).reduce(async (newManifestPromise, themeId) => {
          const theme = extension.themes[themeId];
          await copyFile(theme.path, themePath(path.basename(theme.path)));
          if (theme.include) {
            await copyFile(
              path.resolve(path.dirname(theme.path), theme.include),
              themePath(path.basename(theme.include)));
          }

          return {
            ...await newManifestPromise,
            [themeId]: {
              ...theme,
              path: path.basename(theme.path),
              include: undefined,
            }
          }
        }, Promise.resolve({})),
      };
    }, Promise.resolve({}));

    await writeFile(
      themePath('manifest.json'),
      JSON.stringify(themeManifest, null, '  '));
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