// @ts-check
jest.mock('request');
jest.mock('decompress');
jest.mock('../src/utils');
const request = require('request');
const decompress = require('decompress');
const path = require('path');
const plugin = require('../src');
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

const markdownNode = { fileAbsolutePath: path.join(__dirname, 'test.md') };
/** @type {import('../src').PluginOptions} */
const options = { injectStyles: false };

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

describe('included languages and themes', () => {
  it('works with default options', async () => {
    const markdownAST = createMarkdownAST();
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache }, options);
    expect(markdownAST).toMatchSnapshot();
  });

  it('does nothing if language is not recognized', async () => {
    const markdownAST = createMarkdownAST('none');
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache }, options);
    expect(markdownAST).toEqual(createMarkdownAST('none'));
  });

  it('fails if no grammar file is found', async () => {
    expect.assertions(1);
    const markdownAST = createMarkdownAST('none');
    const cache = createCache();
    try {
      await plugin({ markdownAST, markdownNode, cache }, {
        ...options,
        scopesByLanguage: { none: 'source.none' },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  it('only adds theme CSS once', async () => {
    const markdownAST = { children: [...createMarkdownAST().children, ...createMarkdownAST().children] };
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache }, options);
    expect(markdownAST.children.filter(node => node.type === 'html')).toHaveLength(3);
  });

  it('can use a standard language alias', async () => {
    const markdownAST = createMarkdownAST('JavaScript');
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache }, options);
    expect(markdownAST.children.filter(node => node.type === 'html')).toHaveLength(2);
  });

  it('can use a custom language alias', async () => {
    const markdownAST = createMarkdownAST('java-scripty');
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache }, { ...options, languageAliases: { 'java-scripty': 'js' } });
    expect(markdownAST.children.filter(node => node.type === 'html')).toHaveLength(2);
  });

  it('can use a custom scope mapping', async () => {
    const markdownAST = createMarkdownAST('swift');
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache }, { ...options, scopesByLanguage: { swift: 'source.js' } });
    expect(markdownAST.children.filter(node => node.type === 'html')).toHaveLength(2);
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
    const requestMock = request.get.mockImplementationOnce((_, __, cb) => {
      cb(null, { statusCode: 200, headers: {} }, Buffer.from(''));
    });
    // @ts-ignore
    const decompressMock = decompress.mockImplementationOnce(jest.fn());
    // @ts-ignore
    utils.getExtensionPackageJson.mockImplementationOnce(() => ({
      contributes: {
        themes: [{
          id: 'custom',
          label: 'Custom Theme',
          path: '../../../../test/custom.tmTheme.json'
        }],
      }
    }));

    const markdownAST = createMarkdownAST();
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache }, {
      ...options,
      colorTheme: 'custom',
      extensions: [{
        identifier: 'publisher.custom-theme',
        version: '1.0.0',
        themes: ['custom'],
      }],
    });

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(decompressMock).toHaveBeenCalledTimes(1);
    expect(markdownAST).toMatchSnapshot();
  });

  it('can download an extension to resolve a grammar', async () => {
    // @ts-ignore
    const requestMock = request.get.mockImplementationOnce((_, __, cb) => {
      cb(null, { statusCode: 200, headers: {} }, Buffer.from(''));
    });
    // @ts-ignore
    const decompressMock = decompress.mockImplementationOnce(jest.fn());
    // @ts-ignore
    utils.getExtensionPackageJson.mockImplementationOnce(() => ({
      contributes: {
        languages: [{
          id: 'custom',
        }],
        grammars: [{
          language: 'custom',
          scopeName: 'source.custom',
          path: '../../../../test/custom.tmLanguage.json',
        }],
      }
    }));

    const markdownAST = createMarkdownAST('custom');
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache }, {
      ...options,
      extensions: [{
        identifier: 'publisher.custom-language',
        version: '1.0.0',
        languages: ['custom'],
      }],
    });

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(decompressMock).toHaveBeenCalledTimes(1);
    expect(markdownAST).toMatchSnapshot();
  });
});

it('sets highlighted line class names', async () => {
  const markdownAST = createMarkdownAST('js{1,3-4}', '// 1\n// 2\n// 3\n// 4\n// 5');
  const cache = createCache();
  await plugin({ markdownAST, markdownNode, cache }, options);
  expect(markdownAST).toMatchSnapshot();
});

it('can replace a color value', async () => {
  const markdownAST = createMarkdownAST();
  const cache = createCache();
  await plugin({ markdownAST, markdownNode, cache }, {
    ...options,
    replaceColor: oldColor => `var(--color-${oldColor.replace('#', '')})`,
  });
  expect(markdownAST).toMatchSnapshot();
});
