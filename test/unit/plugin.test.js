const path = require('path');
const createPlugin = require('../../src');
const utils = require('../../src/utils');
const { createCache, createNodeId, markdownNode, defaultOptions, actions, createMarkdownAST } = require('../utils');

/**
 * @param {PluginOptions=} options
 * @param {*} markdownAST
 */
async function testSnapshot(options, markdownAST = createMarkdownAST(), cache = createCache()) {
  const plugin = createPlugin();
  await plugin({ markdownAST, markdownNode, cache, actions, createNodeId }, { ...defaultOptions, ...options });
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
        path: path.resolve(__dirname, '../data', 'embedded.tmLanguage.json'),
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
    await plugin({ markdownAST, markdownNode, cache, createNodeId, actions }, defaultOptions);
    expect(markdownAST.children.filter(node => node.type === 'html')).toHaveLength(3);
  });

  it('only adds theme CSS once', async () => {
    const plugin = createPlugin();
    const markdownAST = { type: 'root', children: [...createMarkdownAST().children, ...createMarkdownAST().children] };
    const cache = createCache();
    await plugin({ markdownAST, markdownNode, cache, createNodeId, actions }, defaultOptions);
    expect(markdownAST.children.filter(node => node.type === 'html')).toHaveLength(3);
  });

  it('can use a standard language alias', async () => {
    return testSnapshot({}, createMarkdownAST('JavaScript'));
  });

  it('can use a custom language alias', async () => {
    return testSnapshot({ languageAliases: { 'java-scripty': 'js' } }, createMarkdownAST('java-scripty'));
  });

  it('includes special characters in language name', async () => {
    return testSnapshot({}, createMarkdownAST('c++'));
  });
});

it('sets highlighted line class names', async () => {
  const plugin = createPlugin();
  const markdownAST = createMarkdownAST('js{1,3-4}', '// 1\n// 2\n// 3\n// 4\n// 5');
  const cache = createCache();
  await plugin({ markdownAST, markdownNode, cache, createNodeId, actions }, defaultOptions);
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
      theme: {
        default: 'Solarized Light',
        dark: 'Monokai Dimmed',
        media: [{
          match: '(prefers-color-scheme: light)',
          theme: 'Quiet Light',
        }]
      },
    });
  });

  it('supports prefers-color-scheme with dynamically selected themes', async () => {
    const markdownAST = { type: 'root', children: [...createMarkdownAST().children, ...createMarkdownAST().children] };
    let i = 0;
    const darkThemes = ['Dark+ (default dark)', 'Monokai'];
    return testSnapshot({
      theme: () => ({
        default: 'Solarized Light',
        dark: darkThemes[i++],
        media: [{
          match: '(prefers-color-scheme: light)',
          theme: 'Quiet Light',
        }]
      }),
    }, markdownAST);
  });
});

describe('utils', () => {
  describe('requireJson', () => {
    it('works with json5', () => {
      expect(() => utils.requireJson(path.resolve(__dirname, '../data/json5.tmTheme.json'))).not.toThrow();
    });
  });
});
