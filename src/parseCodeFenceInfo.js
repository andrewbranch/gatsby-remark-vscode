// @ts-check
const identifierPattern = /[a-z0-9-–—_+#]/i;
const triviaPattern = /\s/;
const startOfNumberPattern = /[0-9-.]/;
const numberPattern = /[0-9-.e]/;

/**
 * @param {string} input
 * @param {RegExp} pattern
 */
function test(input, pattern) {
  if (input === undefined) return false;
  return pattern.test(input);
}

/**
 * @param {string} lang
 * @param {string=} metaString
 */
function parseCodeFenceInfo(lang, metaString) {
  let pos = 0;
  let meta = {};
  let languageName = '';
  const input = [lang, metaString].filter(Boolean).join(' ');
  skipTrivia();
  if (!isEnd() && current() !== '{') {
    languageName = parseIdentifier();
  }
  const languageNameEnd = pos;
  skipTrivia();
  if (!isEnd() && current() === '{') {
    meta = parseObject();
  }

  if (!isEnd() && languageNameEnd === pos) {
    return fail(`Invalid character in language name: '${current()}'`);
  }

  return { languageName, meta };

  function current() {
    if (isEnd()) {
      return fail('Unexpected end of input');
    }
    return input[pos];
  }

  function isEnd() {
    return pos >= input.length;
  }

  /**
   * @param {string} message
   * @returns {never}
   */
  function fail(message) {
    throw new Error(`Failed parsing code fence header '${input}' at position ${pos}: ${message}`);
  }

  /**
   * @param {string} expected
   */
  function scanExpected(expected) {
    if (isEnd() || current() !== expected) {
      return fail(`Expected '${expected}'`);
    }
    pos++;
  }

  function parseIdentifier(errorMessage = 'Expected identifier, but got nothing') {
    let identifier = '';
    while (!isEnd() && test(current(), identifierPattern)) {
      identifier += current();
      pos++;
    }
    if (!identifier) {
      return fail(errorMessage);
    }
    return identifier;
  }

  function skipTrivia() {
    while (!isEnd() && test(current(), triviaPattern)) pos++;
  }

  function parseChar() {
    let char = current();
    if (char === '\\') {
      pos++;
      char += current();
    }
    pos++;
    return char;
  }

  function parseString() {
    let str = '';
    const quote = current();
    pos++;
    while (true) {
      const char = parseChar();
      if (char === quote) break;
      str += char.replace(/\\/, '');
    }
    return str;
  }

  function parseNumber() {
    let numStr = current();
    pos++;
    while (!isEnd() && test(current(), numberPattern)) {
      numStr += current();
      pos++;
    }
    return parseFloat(numStr);
  }

  function parseBoolean() {
    const identifier = parseIdentifier('Expected expression, but got nothing');
    switch (identifier) {
      case 'true':
        return true;
      case 'false':
        return false;
      case '':
        return fail('Expected expression, but got nothing');
      default:
        return fail(`Unrecognized input '${identifier}'`);
    }
  }

  function parseExpression() {
    switch (current()) {
      case '{':
        return parseObject();
      case `'`:
      case '"':
        return parseString();
    }
    if (test(current(), startOfNumberPattern)) {
      return parseNumber();
    }
    return parseBoolean();
  }

  function parseObject() {
    let obj = {};
    scanExpected('{');
    skipTrivia();
    while (!isEnd() && current() !== '}') {
      const key = parseIdentifier();
      /** @type {*} */
      let value = true;
      skipTrivia();
      if (current() === ':') {
        pos++;
        skipTrivia();
        value = parseExpression();
        skipTrivia();
      }
      obj[key] = value;
      if (current() === ',') pos++;
      skipTrivia();
    }
    scanExpected('}');
    return obj;
  }
}

module.exports = parseCodeFenceInfo;
