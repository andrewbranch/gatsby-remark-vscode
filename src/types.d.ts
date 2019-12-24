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

interface LegacyThemeSettings {
  defaultTheme: string;
  prefersLightTheme?: string;
  prefersDarkTheme?: string;
}

interface ThemeSettings {
  default: string;
  dark?: string;
  parentSelector?: Record<string, string>;
  media?: MediaQuerySetting[];
}

interface MediaQuerySetting {
  match: string;
  theme: string;
}

interface FetchResponse {
  body: Buffer | undefined;
  statusCode: number;
}

interface Host {
  fetch: (url: string, options: import('request').CoreOptions) => Promise<FetchResponse>;
  decompress: (input: string | Buffer, output: string) => Promise<unknown>;
}

type LegacyThemeOption = string | LegacyThemeSettings | ((data: CodeFenceData) => string | LegacyThemeSettings);
type ThemeOption = string | ThemeSettings | ((data: CodeFenceData) => string | ThemeSettings);

interface PluginOptions {
  theme?: ThemeOption;
  colorTheme?: LegacyThemeOption;
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
  lines: BinaryToken[][] | undefined;
  theme: ConditionalTheme;
  colorMap: string[];
  settings: Record<string, string>;
}

type DefaultThemeCondition = { condition: 'default' };
type MatchMediaThemeCondition = { condition: 'matchMedia', value: string };
type ParentSelectorThemeCondition = { condition: 'parentSelector', value: string };
type ThemeCondition = DefaultThemeCondition | MatchMediaThemeCondition | ParentSelectorThemeCondition;

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
  isTokenized: boolean;
  tokenizationResults: TokenizeWithThemeResult[];
}

interface MDASTNode {
  type: string;
  value: string;
}

interface NodeRegistry {
  register: (node: MDASTNode, data: RegisteredNodeData) => void;
  mapLines: <T>(node: MDASTNode, mapper: (line: Line, index: number, lines: Line[]) => T) => T[];
  mapTokens: <T>(
    node: MDASTNode,
    lineIndex: number,
    tokenMapper: (text: string, classNames: { value: string[], theme: ConditionalTheme }[]) => T,
    plainLineMapper: (text: string) => T
  ) => T[];
  forEachNode: (action: (data: RegisteredNodeData, node: MDASTNode) => void) => void;
  getAllPossibleThemes: () => { theme: ConditionalTheme, settings: Record<string, string> }[];
  getTokenStylesForTheme: (themeIdentifier: string) => { className: string, css: grvsc.CSSDeclaration[] }[];
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
  interface Writer {
    write: (text: string) => void;
    writeList: <T>(list: T[], writeElement: (element: T) => void, writeSeparator: () => void) => void;
    writeNewLine: () => void;
    increaseIndent: () => void;
    decreaseIndent: () => void;
    getText: () => string;
    noop: () => void;
  }

  type HTMLElement = {
    tagName: string;
    attributes: Record<string, string>;
    children: (HTMLElement | CSSElement | string)[];
    renderOptions?: RenderOptions;
  };

  interface RenderOptions {
    whitespace?: number;
  }

  type CSSMediaQuery = {
    kind: 'MediaQuery';
    mediaQueryList: string;
    body: CSSRuleset[];
    leadingComment?: string;
  }

  type CSSRuleset = {
    kind: 'Ruleset';
    selectors: string[];
    body: CSSDeclaration[];
    leadingComment?: string;
  };

  type CSSDeclaration = {
    property: string;
    value: string;
  };

  type CSSElement = CSSMediaQuery | CSSRuleset;
}