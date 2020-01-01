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

  /** @type {Token[][]} */
  const tokens = [];
  let ruleStack = undefined;
  for (const line of lines) {
    const binary = grammar.tokenizeLine2(line.text, ruleStack);
    const full = grammar.tokenizeLine(line.text, ruleStack).tokens;
    /** @type {Token[]} */
    const lineTokens = [];
    for (const token of full) {
      lineTokens.push({
        start: token.startIndex,
        end: token.endIndex,
        scopes: token.scopes,
        metadata: getMetaAtPosition(binary.tokens, token.startIndex)
      });
    }
    tokens.push(lineTokens);
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
 * @param {Uint32Array} tokens
 * @param {number} position
 */
function getMetaAtPosition(tokens, position) {
  for (let i = 0; i < tokens.length; i += 2) {
    const start = tokens[i];
    if (start >= position) {
      return tokens[i + 1];
    }
  }
}

module.exports = tokenizeWithTheme;
