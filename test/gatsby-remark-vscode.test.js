// @ts-check
jest.mock('request');
jest.mock('decompress');
jest.mock('../src/utils');
const { execSync } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const request = require('request');
const unified = require('unified');
const reparseHast = require('hast-util-raw');
const mdastToHast = require('mdast-util-to-hast');
const remark = require('remark-parse');
const stringify = require('rehype-stringify');
const decompress = require('decompress');
const createPlugin = require('../src');
const utils = require('../src/utils');
const realUtils = jest.requireActual('../src/utils');
const { renderDocument, renderNewCase, renderTestDiff } = require('./integration/render');

const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);
const writeFile = promisify(fs.writeFile);
/** @param {string} fileName */
async function tryReadFile(fileName) {
  if (await exists(fileName)) {
    return readFile(fileName, 'utf8');
  }
}

function tryRequire(specifier) {
  try {
    return require(specifier);
  } catch {
    return undefined;
  }
}

// @ts-ignore
utils.parseExtensionIdentifier.mockImplementation(realUtils.parseExtensionIdentifier);
// @ts-ignore
utils.getExtensionBasePath.mockImplementation(realUtils.getExtensionBasePath);
// @ts-ignore
utils.getExtensionPath.mockImplementation(realUtils.getExtensionPath);
// @ts-ignore
utils.getLanguageNames.mockImplementation(realUtils.getLanguageNames);
// @ts-ignore
utils.requireJson.mockImplementation(realUtils.requireJson);
// @ts-ignore
utils.requireGrammar.mockImplementation(realUtils.requireGrammar);
// @ts-ignore
utils.sanitizeForClassName.mockImplementation(realUtils.sanitizeForClassName);

const markdownNode = { fileAbsolutePath: path.join(__dirname, 'test.md') };
/** @type {import('../src').PluginOptions} */
const defaultOptions = { injectStyles: false };

function createCache() {
  return new Map();
}

function createMarkdownAST(lang = 'js', value = 'const x = 3;\n// Comment') {
  return {
    type: 'root',
    children: [
      { type: 'paragraph', children: [] },
      { type: 'code', lang, value },
      { type: 'paragraph', children: [] },
    ],
  };
}

/**
 * @param {import('../src').PluginOptions=} options
 * @param {*} markdownAST
 */
async function testSnapshot(options, markdownAST = createMarkdownAST(), cache = createCache()) {
  const plugin = createPlugin();
  await plugin({ markdownAST, markdownNode, cache }, { ...defaultOptions, ...options });
  expect(markdownAST).toMatchSnapshot();
}

describe('included languages and themes', () => {
  it('works with default options', async () => {
    return testSnapshot();
  });

  it('works without highlighting if language is not recognized', async () => {
    return testSnapshot({}, createMarkdownAST('none'));
  });

  it('works without highlighting if a code fence has no language', async () => {
    return testSnapshot({}, createMarkdownAST(''));
  });

  it('partially works if an embedded grammar is missing', async () => {
    const cache = createCache();
    cache.set('grammars', {
      'source.embedded': {
        path: path.resolve(__dirname, 'embedded.tmLanguage.json'),
        languageNames: ['embedded'],
        languageId: 100,
      },
    });
    return testSnapshot({}, createMarkdownAST('embedded'), cache);
  });

  it('only adds theme CSS once', async () => {
    const plugin = createPlugin();
    const markdownAST = { type: 'root', children: [...createMarkdownAST().children, ...createMarkdownAST().children] };
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache }, defaultOptions);
    expect(markdownAST.children.filter(node => node.type === 'html')).toHaveLength(3);
  });

  it('only adds theme CSS once', async () => {
    const plugin = createPlugin();
    const markdownAST = { type: 'root', children: [...createMarkdownAST().children, ...createMarkdownAST().children] };
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache }, defaultOptions);
    expect(markdownAST.children.filter(node => node.type === 'html')).toHaveLength(3);
  });

  it('can use a standard language alias', async () => {
    return testSnapshot({}, createMarkdownAST('JavaScript'));
  });

  it('can use a custom language alias', async () => {
    return testSnapshot({ languageAliases: { 'java-scripty': 'js' } }, createMarkdownAST('java-scripty'));
  });
});

describe('extension downloading', () => {
  afterEach(() => {
    // @ts-ignore
    request.get.mockReset();
    // @ts-ignore
    decompress.mockReset();
  });

  it('can download an extension to resolve a theme', async () => {
    // @ts-ignore
    const requestMock = request.get.mockImplementation((_, __, cb) => {
      cb(null, { statusCode: 200, headers: {} }, Buffer.from(''));
    });
    // @ts-ignore
    const decompressMock = decompress.mockImplementation(jest.fn());
    // @ts-ignore
    utils.requireJson.mockImplementation((jsonPath) => ({
      contributes: {
        themes: [{
          id: jsonPath.includes('wrong-one') ? 'wrong-one' : 'custom',
          label: jsonPath.includes('wrong-one') ? 'wrong-one' : 'Custom Theme',
          path: `../../../../test/${jsonPath.includes('wrong-one') ? 'wrong-one' : 'custom'}.tmTheme.json`
        }],
      }
    }));

    await testSnapshot({
      colorTheme: 'Custom Theme',
      extensions: [{
        identifier: 'publisher.wrong-one',
        version: '1.0.0',
      }, {
        identifier: 'publisher.custom-theme',
        version: '1.0.0',
      }],
    });

    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(decompressMock).toHaveBeenCalledTimes(2);
  });

  it('can download an extension to resolve a grammar', async () => {
    // @ts-ignore
    const requestMock = request.get.mockImplementation((_, __, cb) => {
      cb(null, { statusCode: 200, headers: {} }, Buffer.from(''));
    });
    // @ts-ignore
    const decompressMock = decompress.mockImplementation(jest.fn());
    // @ts-ignore
    utils.requireJson.mockImplementation((jsonPath) => ({
      contributes: {
        languages: [{
          id: jsonPath.includes('wrong-one') ? 'wrong-one' : 'custom',
        }],
        grammars: [{
          language: jsonPath.includes('wrong-one') ? 'wrong-one' : 'custom',
          scopeName: jsonPath.includes('wrong-one') ? 'source.wrong' : 'source.custom',
          path: `../../../../test/${jsonPath.includes('wrong-one') ? 'wrong-one' : 'custom'}.tmLanguage.json`
        }],
      }
    }));

    await testSnapshot({
      extensions: [{
        identifier: 'publisher.wrong-one',
        version: '1.0.0',
      }, {
        identifier: 'publisher.custom-language',
        version: '1.0.0',
      }],
    }, createMarkdownAST('custom'));

    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(decompressMock).toHaveBeenCalledTimes(2);
  });

  it('can download an extension to a custom location', async () => {
    const plugin = createPlugin();
    // @ts-ignore
    const requestMock = request.get.mockImplementation((_, __, cb) => {
      cb(null, { statusCode: 200, headers: {} }, Buffer.from(''));
    });
    // @ts-ignore
    const decompressMock = decompress.mockImplementation(jest.fn());
    // @ts-ignore
    utils.requireJson.mockImplementation(() => ({
      contributes: {
        languages: [{
          id: 'custom',
        }],
        grammars: [{
          language: 'custom',
          scopeName: 'source.custom',
          path: `../../../../../../custom.tmLanguage.json`
        }],
      }
    }));

    return plugin({
      markdownAST: createMarkdownAST('custom'),
      markdownNode,
      cache: createCache(),
    }, {
      extensionDataDirectory: path.resolve(__dirname, 'extensions/one/two/three'),
      extensions: [{
        identifier: 'publisher.custom-language',
        version: '1.0.0',
      }],
    });
  });
});

it('sets highlighted line class names', async () => {
  const plugin = createPlugin();
  const markdownAST = createMarkdownAST('js{1,3-4}', '// 1\n// 2\n// 3\n// 4\n// 5');
  const cache = createCache();
  await plugin({ markdownAST, markdownNode, cache }, defaultOptions);
  expect(markdownAST).toMatchSnapshot();
});

it('can replace a color value', async () => {
  return testSnapshot({
    replaceColor: oldColor => `var(--color-${oldColor.replace('#', '')})`,
  });
});

describe('prefers-color-scheme', () => {
  it('supports prefers-color-scheme via an object for `colorTheme`', async () => {
    return testSnapshot({
      colorTheme: {
        defaultTheme: 'Solarized Light',
        prefersDarkTheme: 'Monokai Dimmed',
        prefersLightTheme: 'Quiet Light',
      },
    });
  });

  it('supports prefers-color-scheme with dynamically selected themes', async () => {
    const markdownAST = { type: 'root', children: [...createMarkdownAST().children, ...createMarkdownAST().children] };
    let i = 0;
    const darkThemes = ['Dark+ (default dark)', 'Monokai'];
    return testSnapshot({
      colorTheme: () => ({
        defaultTheme: 'Solarized Light',
        prefersDarkTheme: darkThemes[i++],
        prefersLightTheme: 'Quiet Light',
      }),
    }, markdownAST);
  });
});

describe('utils', () => {
  describe('requireJson', () => {
    it('works with json5', () => {
      expect(() => realUtils.requireJson(path.resolve(__dirname, 'json5.tmTheme.json'))).not.toThrow();
    });
  });
});

describe('integration tests', () => {
  const defaultOptions = require('./integration/options');
  const processor = unified()
    .use(remark, { commonmark: true })
    // @ts-ignore
    .use(stringify, { sanitize: false });

  const cases = glob.sync('integration/cases/**/*.md', { cwd: __dirname }).map(name => {
    return path.basename(name, '.md');
  });

  /** @type {string[]} */
  const failedCaseHTML = [];
  /** @type {string[]} */
  const newCaseHTML = [];
  it.each(cases)('%s', async name => {
    const plugin = createPlugin();
    const extensionless = path.resolve(__dirname, 'integration/cases', name);
    const md = await readFile(extensionless + '.md');
    const options = tryRequire(extensionless);
    const expected = await tryReadFile(extensionless + '.expected.html');
    const markdownAST =  processor.parse(md);
    await plugin({ markdownAST, markdownNode, cache: createCache() }, { ...defaultOptions, ...options });
    const html = processor.stringify(reparseHast(mdastToHast(markdownAST, { allowDangerousHTML: true })));
    if (!expected) {
      await writeFile(extensionless + '.expected.html', html, 'utf8');
      newCaseHTML.push(renderNewCase(name, html));
    } else {
      if (html !== expected) {
        failedCaseHTML.push(renderTestDiff(name, html, expected));
        expect(html).toBe(expected);
      }
    }
  });

  afterAll(async () => {
    if (failedCaseHTML.length || newCaseHTML.length) {
      const fileName = path.resolve(__dirname, 'integration/report.html');
      await writeFile(fileName, renderDocument([...newCaseHTML, ...failedCaseHTML].join('\n')));
      execSync(`open ${fileName}`);
    }
  });
})