// @ts-check
const { loadColorTheme } = require('../lib/vscode/colorThemeData');

/**
 * @param {Line[]} lines
 * @param {ConditionalTheme} theme
 * @param {import('vscode-textmate').IGrammar | undefined} grammar
 * @param {import('vscode-textmate').Registry} registry
 * @returns {TokenizeWithThemeResult}
 */
function tokenizeWithTheme(lines, theme, grammar, registry) {
  const { resultRules: tokenColors, resultColors: settings } = loadColorTheme(theme.path);
  const defaultTokenColors = {
    settings: {
      foreground: settings['editor.foreground'] || settings.foreground,
      background: settings['editor.background'] || settings.background
    }
  };

  registry.setTheme({ settings: [defaultTokenColors, ...tokenColors] });
  if (!grammar) {
    return {
      theme,
      lines: undefined,
      colorMap: registry.getColorMap(),
      settings
    };
  }

  /** @type {{ binary: BinaryToken[], full: FullToken[] }[]} */
  const tokens = [];
  let ruleStack = undefined;
  for (const line of lines) {
    const binary = grammar.tokenizeLine2(line.text, ruleStack);
    const full = grammar.tokenizeLine(line.text, ruleStack).tokens.map(toFullToken);
    /** @type {BinaryToken[]} */
    const lineTokens = [];
    for (let i = 0; i < binary.tokens.length; i += 2) {
      const start = binary.tokens[i];
      const metadata = binary.tokens[i + 1];
      const end = binary.tokens[i + 2] || line.text.length;
      lineTokens.push({ start, end, metadata });
    }
    tokens.push({ binary: lineTokens, full });
    ruleStack = binary.ruleStack;
  }

  return {
    theme,
    lines: tokens,
    colorMap: registry.getColorMap(),
    settings
  };
}

/**
 * @param {import('vscode-textmate').IToken} token
 * @returns {FullToken}
 */
function toFullToken(token) {
  return {
    start: token.startIndex,
    end: token.endIndex,
    scopes: token.scopes
  };
}

module.exports = tokenizeWithTheme;
