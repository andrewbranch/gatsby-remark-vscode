// @ts-check
const path = require('path');
const plugin = require('../src');

const markdownNode = { fileAbsolutePath: path.join(__dirname, 'test.md') };

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
    await plugin({ markdownAST, markdownNode, cache }, {});
    expect(markdownAST).toMatchSnapshot();
  });

  it('does nothing if language is not recognized', async () => {
    const markdownAST = createMarkdownAST('none');
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache });
    expect(markdownAST).toEqual(createMarkdownAST('none'));
  });

  it('fails if no grammar file is found', async () => {
    expect.assertions(1);
    const markdownAST = createMarkdownAST('none');
    const cache = createCache();
    try {
      await plugin({ markdownAST, markdownNode, cache }, {
        scopesByLanguage: { none: 'source.none' },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  it('only adds theme CSS once', async () => {
    const markdownAST = { children: [...createMarkdownAST().children, ...createMarkdownAST().children] };
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache });
    expect(markdownAST.children.filter(node => node.type === 'html')).toHaveLength(3);
  });

  it('can use a standard language alias', async () => {
    const markdownAST = createMarkdownAST('JavaScript');
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache });
    expect(markdownAST.children.filter(node => node.type === 'html')).toHaveLength(2);
  });

  it('can use a custom language alias', async () => {
    const markdownAST = createMarkdownAST('java-scripty');
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache }, { languageAliases: { 'java-scripty': 'js' } });
    expect(markdownAST.children.filter(node => node.type === 'html')).toHaveLength(2);
  });

  it('can use a custom scope mapping', async () => {
    const markdownAST = createMarkdownAST('swift');
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache }, { scopesByLanguage: { swift: 'source.js' } });
    expect(markdownAST.children.filter(node => node.type === 'html')).toHaveLength(2);
  });
});