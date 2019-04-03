// @ts-check
const fs = require('fs');
const json = require('comment-json');
const util = require('util');
const glob = require('glob');
const path = require('path');

const copyFile = util.promisify(fs.copyFile);
const writeFile = util.promisify(fs.writeFile);
const tryMkdir = /** @param {string} pathName */ pathName => { try { return fs.mkdirSync(pathName) } catch {} };
const requireJson = pathName => json.parse(fs.readFileSync(pathName, 'utf8'));

const grammarDestDir = path.resolve(__dirname, '../lib/grammars');
const themeDestDir = path.resolve(__dirname, '../lib/themes');
const grammarPath = /** @param {string} basename */ basename => path.join(grammarDestDir, basename);
const themePath = /** @param {string} basename */ basename => path.join(themeDestDir, basename);

// Copy langauges
glob(path.resolve(__dirname, '../vscode/extensions/**/*.tmLanguage.json'), async (err, languages) => {
  try {
    if (err) throw err;
    await tryMkdir(grammarDestDir);
    const manifest = await Promise.all(languages.map(async sourcePath => {
      const { scopeName } = requireJson(sourcePath);
      const destPath = grammarPath(path.basename(sourcePath));
      await copyFile(sourcePath, destPath);
      return [scopeName, destPath];
    }));

    await writeFile(
      grammarPath('manifest.json'),
      JSON.stringify(manifest.reduce((hash, [scopeName, filePath]) => ({
        ...hash,
        [scopeName]: path.basename(filePath),
      }), {}), null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

// Copy themes
glob(path.resolve(__dirname, '../vscode/extensions/**/package.json'), async (err, packages) => {
  try {
    if (err) throw err;
    await tryMkdir(themeDestDir);
    const manifest = await Promise.all(packages.map(async packageJsonPath => {
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

    const flattenedManifest = manifest.reduce((hash, themes) => themes ? ({
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