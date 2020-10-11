// @ts-check
const fs = require('fs');
const path = require('path');
const logger = require('loglevel');
const oniguruma = require('vscode-oniguruma');
const { getGrammarLocation, getGrammar, getAllGrammars } = require('./storeUtils');
const { readFile } = require('./utils');
const { Registry, parseRawGrammar } = require('vscode-textmate');

const wasmBin = fs.readFileSync(path.join(require.resolve('vscode-oniguruma'), '../../release/onig.wasm')).buffer;
const onigLib = oniguruma.loadWASM(wasmBin).then(() => {
  return {
    createOnigScanner(patterns) {
      return new oniguruma.OnigScanner(patterns);
    },
    createOnigString(s) {
      return new oniguruma.OnigString(s);
    }
  };
});

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

/**
 * @param {string} missingScopeName
 * @param {string} rootScopeName
 */
function warnMissingLanguageFile(missingScopeName, rootScopeName) {
  logger.info(`No language file was loaded for scope '${missingScopeName}' (requested by '${rootScopeName}').`);
}

function createGetRegistry() {
  /** @type {Registry} */
  let registry;

  /**
   * @param {GatsbyCache} cache
   * @param {string} rootScopeName
   * @returns {Promise<[Registry, () => void]>}
   */
  async function getRegistry(cache, rootScopeName) {
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
          warnMissingLanguageFile(scopeName, rootScopeName);
        },
        getInjections: scopeName => {
          return Object.keys(grammars).reduce((acc, s) => {
            const grammar = grammars[s];
            if (grammar.injectTo && grammar.injectTo.includes(scopeName)) {
              acc.push(s);
            }
            return acc;
          }, []);
        },
        onigLib
      });
    }
    const unlock = await getLock();
    return [registry, unlock];
  }
  return getRegistry;
}

module.exports = createGetRegistry;
