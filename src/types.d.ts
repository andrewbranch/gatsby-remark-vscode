interface ExtensionDemand {
  identifier: string;
  version: string;
}

interface CodeFenceData {
  language: string;
  markdownNode: MDASTNode;
  codeFenceNode: any;
  parsedOptions: any;
}

interface LineData {
  /** The line’s string content */
  content: string;
  /** The zero-based line index */
  index: number;
  /** The code fence’s language */
  language: string;
  /** The code fence’s options parsed from the language suffix */
  meta: object;
}

interface ColorThemeSettings {
  defaultTheme: string;
  prefersLightTheme?: string;
  prefersDarkTheme?: string;
}

interface FetchResponse {
  body: Buffer | undefined;
  statusCode: number;
}

interface Host {
  fetch: (url: string, options: import('request').CoreOptions) => Promise<FetchResponse>;
  decompress: (input: string | Buffer, output: string) => Promise<unknown>;
}

type ColorThemeOption = string | ColorThemeSettings | ((data: CodeFenceData) => string | ColorThemeSettings);

interface PluginOptions {
  colorTheme?: ColorThemeOption;
  wrapperClassName?: string | ((data: CodeFenceData) => string);
  languageAliases?: Record<string, string>;
  extensions?: ExtensionDemand[];
  getLineClassName?: (line: LineData) => string;
  injectStyles?: boolean;
  replaceColor?: (colorValue: string, theme: string) => string;
  extensionDataDirectory?: string;
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  host?: Host;
  getLineTransformers?: (pluginOptions: PluginOptions) => LineTransformer[];
}

interface BinaryToken {
  start: number;
  end: number;
  metadata: number;
}

interface TokenizeWithThemeResult {
  lines: BinaryToken[][];
  colorMap: string[];
  theme: ConditionalTheme;
}

type DefaultThemeCondition = { condition: 'default' };
type MatchMediaThemeCondition = { condition: 'matchMedia', value: string };
type ThemeCondition = DefaultThemeCondition | MatchMediaThemeCondition;

interface ConditionalTheme {
  identifier: string;
  path: string;
  conditions: ThemeCondition[];
}

interface RegisteredNodeData {
  meta: object;
  languageName: string;
  lines: Line[];
  possibleThemes: ConditionalTheme[];
  tokenizationResults: TokenizeWithThemeResult[];
}

interface MDASTNode {
  type: string;
  value: string;
}

interface NodeRegistry {
  register: (node: MDASTNode, data: RegisteredNodeData) => void;
  mapLines: <T>(node: MDASTNode, mapper: (line: Line, index: number, lines: Line[]) => T) => T[];
  mapTokens: <T>(node: MDASTNode, lineIndex: number, mapper: (text: string, classNames: { value: string, theme: ConditionalTheme }[]) => T) => T[];
  forEachNode: (action: (data: RegisteredNodeData, node: MDASTNode) => void) => void;
  getAllPossibleThemes: () => ConditionalTheme[];
  getTokenClassNamesForTheme: (themeIdentifier: string) => { className: string, color: string }[];
}

// Line transformers

type Line = {
  text: string;
  attrs: object;
};

interface LineTransformerResult<T> {
  line?: Line;
  state: T | undefined;
}

interface LineTransformerArgs<T> extends LineTransformerResult<T> {
  language: string;
  meta: object;
}

type LineTransformer<T = any> = (args: LineTransformerArgs<T>) => LineTransformerResult<T> | undefined;

type HighlightCommentTransfomerState = {
  inHighlightRange?: boolean;
  highlightNextLine?: boolean;
};

// Renderers

declare namespace grvsc {
  type HTMLElement = {
    tagName: string;
    attributes: Record<string, string>;
    children: (HTMLElement | string)[];
    renderOptions?: RenderOptions;
  };

  interface RenderOptions {
    whitespace?: number;
  }

  type CSSMediaQuery = {
    kind: 'MediaQuery';
    mediaQueryList: string;
    body: CSSRuleset[];
  }

  type CSSRuleset = {
    kind: 'Ruleset';
    selectors: string[];
    body: CSSDeclaration[];
  };

  type CSSDeclaration = {
    property: string;
    value: string;
  };

  type CSSElement = CSSMediaQuery | CSSRuleset;
}