// @ts-check
const fs = require('fs');
const { getGrammarLocation, getGrammar, getAllGrammars } = require('./storeUtils');
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
    };
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
      const grammars = getAllGrammars(await cache.get('grammars'));
      registry = new Registry({
        loadGrammar: async scopeName => {
          const grammarInfo = getGrammar(scopeName, grammars);
          const fileName = grammarInfo && getGrammarLocation(grammarInfo);
          if (fileName) {
            const contents = await readFile(fileName, 'utf8');
            return parseRawGrammar(contents, fileName);
          }
          onMissingLanguageFile(scopeName);
        },
        getInjections: scopeName => {
          return Object.keys(grammars).reduce((acc, s) => {
            const grammar = grammars[s];
            if (grammar.injectTo && grammar.injectTo.includes(scopeName)) {
              acc.push(s);
            }
            return acc;
          }, []);
        }
      });
    }
    const unlock = await getLock();
    return [registry, unlock];
  }
  return getRegistry;
}

module.exports = createGetRegistry;
