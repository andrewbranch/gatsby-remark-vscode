interface RemarkPluginArguments {
  cache: GatsbyCache;
  markdownAST: MDASTNode;
  markdownNode: MarkdownNode;
  actions: {
    createNode: (node: grvsc.gql.Node) => void;
    createParentChildLink: (nodes: { parent: grvsc.gql.Node, child: grvsc.gql.Node }) => void;
  };
  createNodeId: (key: string) => string;
}

interface CodeBlockData {
  language?: string;
  markdownNode: MarkdownNode;
  /** @deprecated Use `node` instead. */
  codeFenceNode: MDASTNode<'code'>;
  node: MDASTNode<'code'>;
  parsedOptions: any;
}

interface CodeSpanData {
  language?: string;
  markdownNode: MarkdownNode;
  node: MDASTNode<'inlineCode'>;
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

type ThemeOption<T extends CodeBlockData | CodeSpanData> = string | ThemeSettings | ((data: T) => string | ThemeSettings);

interface PluginOptions {
  theme?: ThemeOption<CodeBlockData>;
  wrapperClassName?: string | ((data: CodeBlockData) => string);
  languageAliases?: Record<string, string>;
  extensions?: string[];
  getLineClassName?: (line: LineData) => string;
  injectStyles?: boolean;
  replaceColor?: (colorValue: string, theme: string) => string;
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  host?: Host;
  getLineTransformers?: (pluginOptions: PluginOptions, cache: GatsbyCache) => LineTransformer[];
  inlineCode?: {
    theme?: ThemeOption<CodeSpanData>;
    marker: string;
    className?: string | ((data: CodeSpanData) => string | undefined);
  }
}

interface GrammarData {
  scopeName: string;
  languageId: number;
  path: string;
  tokenTypes: import('vscode-textmate').ITokenTypeMap | undefined;
  embeddedLanguages: Record<string, string> | undefined;
  injectTo: string[] | undefined;
  languageNames: string[];
}

interface ThemeData {
  id: string;
  path: string;
  label: string;
  include: string | undefined;
  packageName: string;
  isOnlyThemeInPackage: boolean;
}

type GrammarCache = Record<string, GrammarData>;
type ThemeCache = Record<string, ThemeData>;

interface GatsbyCache {
  get(key: 'grammars'): Promise<GrammarCache>;
  get(key: 'themes'): Promise<ThemeCache>;
  get(key: string): Promise<any>;
  set(key: string, data: any): Promise<void>;
}

interface DecodedTokenMeta {
  classNames: string[];
  bold: boolean;
  italic: boolean;
  underline: boolean;
  foreground: number;
}

interface Token {
  start: number;
  end: number;
  metadata: number;
  scopes: string[];
}

interface TokenizeWithThemeResult {
  lines: Token[][] | undefined;
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

type RawTheme = import('vscode-textmate').IRawTheme & { resultColors: Record<string, string> };

interface RegisteredCodeNodeData {
  index: number;
  meta: object;
  text: string;
  languageName: string;
  lines: Line[];
  possibleThemes: ConditionalTheme[];
  isTokenized: boolean;
  tokenizationResults: TokenizeWithThemeResult[];
  className?: string;
}

interface RegisteredToken {
  text: string;
  scopes: string[];
  startIndex: number;
  endIndex: number;
  defaultThemeTokenData: grvsc.gql.GRVSCThemeTokenData;
  additionalThemeTokenData: grvsc.gql.GRVSCThemeTokenData[];
}

interface Keyable {
  type: 'code' | 'inlineCode';
}

interface MDASTNode<T = string> {
  type: T;
  lang?: string;
  meta?: string;
  value?: string;
  children?: MDASTNode[];
}

interface MarkdownNode extends grvsc.gql.Node {
  fileAbsolutePath: string;
}

type Line = {
  gutterCells: (GutterCell | undefined)[];
  text: string;
  attrs: object;
  data: object;
  setContainerClassName?: string;
};

interface CodeNodeRegistry<TKey extends Keyable> {
  register: (key: TKey, data: Omit<RegisteredCodeNodeData, 'index'>) => void;
  forEachLine: (codeBlockKey: TKey, action: (line: Line, index: number, lines: Line[]) => void) => void;
  forEachToken: (
    key: TKey,
    lineIndex: number,
    tokenAction: (token: RegisteredToken) => void
  ) => void;
  forEachCodeBlock: (action: (data: RegisteredCodeNodeData, codeBlockKey: TKey & { type: 'code' }) => void) => void;
  forEachCodeSpan: (action: (data: RegisteredCodeNodeData, codeSpanKey: TKey & { type: 'inlineCode' }) => void) => void;
  getAllPossibleThemes: () => { theme: ConditionalTheme, settings: Record<string, string> }[];
  getTokenStylesForTheme: (themeIdentifier: string) => { className: string, css: grvsc.CSSDeclaration[] }[];
}

interface CodeNodeRegistryOptions {
  prefixAllClassNames?: boolean;
}

// Line transformers

interface LineTransformerInfo<T> {
  line?: {
    text: string;
    attrs: object;
  };
  state: T | undefined;
}

interface GutterCell {
  className?: string;
  text?: string;
}

interface LineTransformerResult<T> extends LineTransformerInfo<T> {
  data?: object;
  gutterCells?: (GutterCell | undefined)[];
  setContainerClassName?: string;
}

interface LineTransformerArgs<T> extends LineTransformerInfo<T> {
  language: string;
  meta: any;
}

interface LineTransformer<TState = any> {
  (args: LineTransformerArgs<TState>): LineTransformerResult<TState> | Promise<LineTransformerResult<TState>>;
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

  // GraphQL (merged with schema.d.ts)
  namespace gql {
    interface Node {
      id: string;
      parent?: string;
      internal?: {
        type: string;
        contentDigest?: string;
      };
    }

    interface ThemedArgs {
      defaultTheme?: string;
      additionalThemes?: GRVSCThemeArgument[];
    }

    interface CSSArgs extends ThemedArgs {
      injectStyles?: boolean;
    }

    interface HighlightArgs extends ThemedArgs {
      source: string;
      language?: string;
      defaultTheme?: string;
      additionalThemes?: GRVSCThemeArgument[];
      meta?: string;
    }
  }

  namespace conditionParsing {
    type SyntaxKind =
      | 'Unknown'
      | 'OpenParen'
      | 'CloseParen'
      | 'StringLiteral'
      | 'Identifier'
      | 'Call'
      | 'EOF';

    interface Node {
      kind: SyntaxKind;
      pos: number;
    }
    interface Identifier extends Node {
      kind: 'Identifier';
      text: string;
    }
    interface StringLiteral extends Node {
      kind: 'StringLiteral';
      text: string;
    }
    interface Call extends Node {
      kind: 'Call';
      target: Identifier;
      argument: StringLiteral;
    }
    type Expression = Identifier | StringLiteral | Call;
  }
}