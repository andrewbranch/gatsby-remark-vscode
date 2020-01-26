const fs = require('fs');
const path = require('path');
const open = require('open');
const glob = require('glob');
const unified = require('unified');
const reparseHast = require('hast-util-raw');
const mdastToHast = require('mdast-util-to-hast');
const remark = require('remark-parse');
const stringify = require('rehype-stringify');
const { promisify } = require('util');
const { renderDocument, renderNewCase, renderTestDiff } = require('./viewer/render');
const { markdownNode, createCache, createNodeId, actions } = require('../utils');
const createPlugin = require('../../src');

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

describe('integration tests', () => {
  const processor = unified()
    .use(remark, { commonmark: true })
    // @ts-ignore
    .use(stringify, { sanitize: false });

  const cases = glob.sync('cases/**/test.md', { cwd: __dirname }).map(name => {
    return name.slice('cases/'.length, name.length - '/test.md'.length);
  });

  /** @type {string[]} */
  const failedCaseHTML = [];
  /** @type {string[]} */
  const newCaseHTML = [];

  it.each(cases)('%s', async name => {
    const config = JSON.parse(process.env.JEST_CONFIG);
    const updateSnapshots = config.updateSnapshot === 'all';
    const createNewSnapshot = config.updateSnapshot === 'new';

    const plugin = createPlugin();
    const directory = path.resolve(__dirname, 'cases', name);
    const md = await readFile(`${directory}/test.md`);
    const options = tryRequire(`${directory}/options.js`);
    const baselinePath = path.resolve(__dirname, 'baselines', `${name}.html`);
    const expected = await tryReadFile(baselinePath);
    const markdownAST = processor.parse(md);
    await plugin({ markdownAST, markdownNode, cache: createCache(), createNodeId, actions }, { ...options });
    const html = processor.stringify(reparseHast(mdastToHast(markdownAST, { allowDangerousHTML: true })));
    if (!expected && createNewSnapshot || updateSnapshots) {
      await writeFile(baselinePath, html, 'utf8');
      newCaseHTML.push(renderNewCase(name, html));
    } else if (html !== expected) {
      failedCaseHTML.push(renderTestDiff(name, html, expected));
      expect(html).toBe(expected);
    }
  });

  afterAll(async () => {
    if (failedCaseHTML.length || newCaseHTML.length) {
      const fileName = path.resolve(__dirname, 'viewer/report.html');
      await writeFile(fileName, renderDocument([...newCaseHTML, ...failedCaseHTML].join('\n')));
      return open(fileName);
    }
  });
});
