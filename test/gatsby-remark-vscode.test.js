// @ts-check
const { execSync } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const unified = require('unified');
const reparseHast = require('hast-util-raw');
const mdastToHast = require('mdast-util-to-hast');
const remark = require('remark-parse');
const stringify = require('rehype-stringify');
const createPlugin = require('../src');
const utils = require('../src/utils');
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

/** @type {MarkdownNode} */
const markdownNode = { id: '1234', fileAbsolutePath: path.join(__dirname, 'test.md') };
/** @type {PluginOptions} */
const defaultOptions = {
  injectStyles: false,
  logLevel: 'error',
  host: {
    decompress: () => fail('host.decompress should not be called without providing a test host')
  }
};

/** @returns {any} */
function createCache() {
  return  new Map();
}

const noop = () => {};
const actions = { createNode: noop, createParentChildLink: noop };
const createNodeId = () => '';

/** @returns {any} */
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
        path: path.resolve(__dirname, 'fixtures', 'embedded.tmLanguage.json'),
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
      expect(() => utils.requireJson(path.resolve(__dirname, 'fixtures/json5.tmTheme.json'))).not.toThrow();
    });
  });
});

describe('integration tests', () => {
  const update = /(\s|^)(-u|--update|--updateSnapshot|--update-snapshot)(\s|$)/.test(process.argv.join(' '));
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
    const markdownAST = processor.parse(md);
    await plugin({ markdownAST, markdownNode, cache: createCache(), createNodeId, actions }, { ...defaultOptions, ...options });
    const html = processor.stringify(reparseHast(mdastToHast(markdownAST, { allowDangerousHTML: true })));
    if (!expected || update) {
      await writeFile(extensionless + '.expected.html', html, 'utf8');
      newCaseHTML.push(renderNewCase(name, html));
    } else if (html !== expected) {
      failedCaseHTML.push(renderTestDiff(name, html, expected));
      expect(html).toBe(expected);
    }
  });

  afterAll(async () => {
    if (failedCaseHTML.length || newCaseHTML.length) {
      const fileName = path.resolve(__dirname, 'integration/report.html');
      await writeFile(fileName, renderDocument([...newCaseHTML, ...failedCaseHTML].join('\n')));
      execSync(`open ${fileName}`);
    }
  });
});
