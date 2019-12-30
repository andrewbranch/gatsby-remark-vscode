interface RemarkPluginArguments {
  cache: GatsbyCache;
  markdownAST: MDASTNode;
  markdownNode: MarkdownNode;
  actions: any;
  createNodeId: (key: string) => string;
}

interface CodeFenceData {
  language: string;
  markdownNode: MarkdownNode;
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

interface Host {
  decompress: (input: string | Buffer, output: string) => Promise<unknown>;
}

type LegacyThemeOption = string | LegacyThemeSettings | ((data: CodeFenceData) => string | LegacyThemeSettings);
type ThemeOption = string | ThemeSettings | ((data: CodeFenceData) => string | ThemeSettings);

interface PluginOptions {
  theme?: ThemeOption;
  colorTheme?: LegacyThemeOption;
  wrapperClassName?: string | ((data: CodeFenceData) => string);
  languageAliases?: Record<string, string>;
  extensions?: string[];
  getLineClassName?: (line: LineData) => string;
  injectStyles?: boolean;
  replaceColor?: (colorValue: string, theme: string) => string;
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  host?: Host;
  getLineTransformers?: (pluginOptions: PluginOptions) => LineTransformer[];
}

interface GatsbyCache {
  get(key: string): Promise<any>;
  set(key: string, data: any): Promise<void>;
}

interface BinaryToken {
  start: number;
  end: number;
  metadata: number;
}

interface FullToken {
  start: number;
  end: number;
  scopes: string[];
}

interface TokenizeWithThemeResult {
  lines: { binary: BinaryToken[], full: FullToken[] }[] | undefined;
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
  text: string;
  languageName: string;
  lines: Line[];
  possibleThemes: ConditionalTheme[];
  isTokenized: boolean;
  tokenizationResults: TokenizeWithThemeResult[];
}

interface MDASTNode {
  type: string;
  value?: string;
  children?: MDASTNode[];
}

interface MarkdownNode {
  id: string;
  fileAbsolutePath: string;
  internal: {
    contentDigest: string;
  };
}

type Line = {
  text: string;
  attrs: object;
  data: object;
};

interface NodeRegistry {
  register: (node: MDASTNode, data: RegisteredNodeData) => void;
  forEachLine: (node: MDASTNode, action: (line: Line, index: number, lines: Line[]) => void) => void;
  forEachToken: (
    node: MDASTNode,
    lineIndex: number,
    tokenAction: (text: string, classNames: { value: string[], theme: ConditionalTheme }[]) => void,
    plainLineAction: (text: string) => void
  ) => void;
  forEachNode: (action: (data: RegisteredNodeData, node: MDASTNode) => void) => void;
  getAllPossibleThemes: () => { theme: ConditionalTheme, settings: Record<string, string> }[];
  getTokenStylesForTheme: (themeIdentifier: string) => { className: string, css: grvsc.CSSDeclaration[] }[];
}

// Line transformers

interface LineTransformerInfo<T> {
  line?: {
    text: string;
    attrs: object;
  };
  state: T | undefined;
}

interface LineTransformerResult<T> extends LineTransformerInfo<T> {
  data?: object;
}

interface LineTransformerArgs<T> extends LineTransformerInfo<T> {
  language: string;
  meta: object;
}

interface LineTransformer<T = any> {
  (args: LineTransformerArgs<T>): LineTransformerResult<T>;
  displayName: string;
  schemaExtension?: string;
}

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