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

  /** @type {BinaryToken[][]} */
  const tokens = [];
  let ruleStack = undefined;
  for (const line of lines) {
    const result = grammar.tokenizeLine2(line.text, ruleStack);
    /** @type {BinaryToken[]} */
    const lineTokens = [];
    for (let i = 0; i < result.tokens.length; i += 2) {
      const start = result.tokens[i];
      const metadata = result.tokens[i + 1];
      const end = result.tokens[i + 2] || line.text.length;
      lineTokens.push({ start, end, metadata });
    }
    tokens.push(lineTokens);
    ruleStack = result.ruleStack;
  }

  return {
    theme,
    lines: tokens,
    colorMap: registry.getColorMap(),
    settings
  };
}

module.exports = tokenizeWithTheme;
