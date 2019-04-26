// @ts-check
const fs = require('fs');
const { getGrammarLocation, getGrammar } = require('./storeUtils');
const { promisify } = require('util');
const { Registry, parseRawGrammar } = require('vscode-textmate');
const readFile = promisify(fs.readFile);

function createEmitter() {
  /** @type {() => void} */
  let subscriber;
  function emit() {
    if (subscriber) subscriber();
  }
  /** @param {() => void} s */
  function subscribe(s) {
    subscriber = s;
  }
  return { emit, subscribe };
}

// I’m not sure if there are any cases where Gatsby will try
// to run the plugin on multiple Markdown documents at once
// since it’s async, but we use a singleton Registry for
// performance and it’s stateful with respect to its current
// theme.
const getLock = (() => {
  let currentLock = Promise.resolve();
  async function getLock() {
    await currentLock;
    const { emit, subscribe } = createEmitter();
    currentLock = new Promise(resolve => {
      subscribe(resolve);
    });
    return function unlock() {
      emit();
    }
  }
  return getLock;
})();

function createGetRegistry() {
  /** @type {Registry} */
  let registry;
  
  /**
   * @param {*} cache 
   * @param {(missingScopeName: string) => void} onMissingLanguageFile 
   * @returns {Promise<[Registry, () => void]>}
   */
  async function getRegistry(cache, onMissingLanguageFile) {
    if (!registry) {
      registry = new Registry({
        loadGrammar: async scopeName => {
          const fileName = getGrammarLocation(getGrammar(scopeName, await cache.get('grammars')));
          if (fileName) {
            const contents = await readFile(fileName, 'utf8');
            return parseRawGrammar(contents, fileName);
          } else {
            onMissingLanguageFile(scopeName);
          }
        },
      });
    }
    const unlock = await getLock();
    return [registry, unlock];
  }
  return getRegistry;
}

module.exports = createGetRegistry;
