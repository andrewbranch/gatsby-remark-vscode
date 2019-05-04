// @ts-check
jest.mock('request');
jest.mock('decompress');
jest.mock('../src/utils');
const request = require('request');
const decompress = require('decompress');
const path = require('path');
const createPlugin = require('../src');
const utils = require('../src/utils');
const realUtils = jest.requireActual('../src/utils');

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
    children: [
      { type: 'paragraph' },
      { type: 'code', lang, value },
      { type: 'paragraph' },
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
    const markdownAST = { children: [...createMarkdownAST().children, ...createMarkdownAST().children] };
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
    const plugin = createPlugin();
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
    const plugin = createPlugin();
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
    const markdownAST = { children: [...createMarkdownAST().children, ...createMarkdownAST().children] };
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
