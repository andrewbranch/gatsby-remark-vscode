const path = require('path');

/** @type {MarkdownNode} */
const markdownNode = { id: '1234', fileAbsolutePath: path.join(__dirname, 'test.md'), internal: { type: 'Markdown', contentDigest: '' } };
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
  return new Map();
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

module.exports = {
  markdownNode,
  defaultOptions,
  createCache,
  actions,
  createNodeId,
  createMarkdownAST
};
