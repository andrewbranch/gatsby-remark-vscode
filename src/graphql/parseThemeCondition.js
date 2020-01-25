/** @param {string} char */
function isAlpha(char) {
  const code = char.charCodeAt(0);
  return 65 <= code && code <= 122;
}

/** @param {string} char */
function isKnownTokenStart(char) {
  return char === '(' || char === ')' || char === '"' || char === `'` || isAlpha(char);
}

/**
 * @param {string} condition
 */
function createScanner(condition) {
  let pos = 0;
  let end = 0;
  return {
    next,
    peek,
    getTokenText,
    getPos
  };

  /** @returns {grvsc.conditionParsing.SyntaxKind} */
  function next() {
    pos = end;
    const char = condition[pos];
    switch (char) {
      case undefined:
        return 'EOF';
      case '(':
        end++;
        return 'OpenParen';
      case ')':
        end++;
        return 'CloseParen';
      case '"':
        return scanStringLiteral('"');
      case `'`:
        return scanStringLiteral(`'`);
    }
    if (isAlpha(char)) {
      return scanIdentifier();
    }
    while (!isKnownTokenStart(char)) {
      end++;
    }
    return 'Unknown';
  }

  function peek() {
    const savePos = pos;
    const saveEnd = end;
    const token = next();
    pos = savePos;
    end = saveEnd;
    return token;
  }

  /**
   * @param {string} quote
   * @returns {'StringLiteral'}
   */
  function scanStringLiteral(quote) {
    end++;
    while (condition[end] !== quote && end < condition.length) {
      end++;
    }
    end++;
    return 'StringLiteral';
  }

  /** @returns {'Identifier'} */
  function scanIdentifier() {
    while (isAlpha(condition[end])) {
      end++;
    }
    return 'Identifier';
  }

  function getTokenText() {
    return condition.slice(pos, end);
  }

  function getPos() {
    return pos;
  }
}

/**
 * @param {string} condition
 * @param {grvsc.conditionParsing.Expression} expression
 * @returns {ThemeCondition}
 */
function expressionToCondition(condition, expression) {
  switch (expression.kind) {
    case 'Identifier':
      if (expression.text === 'default') {
        return { condition: 'default' };
      }
      return fail(`Unknown condition '${expression.text}'`);
    case 'Call':
      switch (expression.target.text) {
        case 'matchMedia':
          return { condition: 'matchMedia', value: expression.argument.text };
        case 'parentSelector':
          return { condition: 'parentSelector', value: expression.argument.text };
        default:
          return fail(`Unknown condition '${expression.target.text}'`);
      }
    default:
      return fail(`Unprocessable condition string '${condition}'`);
  }

  /**
   * @param {string} message
   * @returns {never}
   */
  function fail(message) {
    throw new Error(`Error interpreting theme condition '${condition}': ${message}`);
  }
}

/**
 * @param {string} condition
 * @returns {ThemeCondition}
 */
function parseThemeCondition(condition) {
  const scanner = createScanner(condition);
  const expression = parsePrimary();
  parseExpected('EOF');
  return expressionToCondition(condition, expression);

  /** @returns {grvsc.conditionParsing.Expression} */
  function parsePrimary() {
    switch (scanner.next()) {
      case 'Identifier':
        return scanner.peek() === 'OpenParen' ? parseCall() : parseIdentifier();
      case 'StringLiteral':
        return parseStringLiteral();
      default:
        return fail(`Unexpected input '${scanner.getTokenText()}'`);
    }
  }

  /** @returns {grvsc.conditionParsing.Identifier} */
  function parseIdentifier() {
    return {
      kind: 'Identifier',
      pos: scanner.getPos(),
      text: scanner.getTokenText()
    };
  }

  /** @returns {grvsc.conditionParsing.StringLiteral} */
  function parseStringLiteral() {
    const fullText = scanner.getTokenText();
    return {
      kind: 'StringLiteral',
      pos: scanner.getPos(),
      text: fullText.slice(1, fullText.length - 1)
    };
  }

  /** @returns {grvsc.conditionParsing.Call} */
  function parseCall() {
    const pos = scanner.getPos();
    const target = parseIdentifier();
    parseExpected('OpenParen');
    if (scanner.next() !== 'StringLiteral') {
      return fail(`Expected a quoted string literal, but got '${scanner.getTokenText()}'`);
    }
    const argument = parseStringLiteral();
    parseExpected('CloseParen');
    return {
      kind: 'Call',
      pos,
      target,
      argument
    };
  }

  /** @param {grvsc.conditionParsing.SyntaxKind} kind */
  function parseExpected(kind) {
    const actual = scanner.next();
    if (actual !== kind) {
      if (actual === 'EOF') {
        return fail(`Expected token '${kind}', but reached the end of input`);
      }
      if (kind === 'EOF') {
        return fail(`Unexpected input '${scanner.getTokenText()}'`);
      }
      return fail(`Expected token '${kind}', but got '${scanner.getTokenText()}'`);
    }
  }

  /**
   * @param {string} message
   * @returns {never}
   */
  function fail(message) {
    throw new Error(`Error parsing theme condition '${condition}': ${message}`);
  }
}

module.exports = parseThemeCondition;
