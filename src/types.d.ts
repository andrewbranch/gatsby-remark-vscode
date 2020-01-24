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

interface RegisteredCodeBlockData {
  index: number;
  meta: object;
  text: string;
  languageName: string;
  lines: Line[];
  possibleThemes: ConditionalTheme[];
  isTokenized: boolean;
  tokenizationResults: TokenizeWithThemeResult[];
}

interface RegisteredToken {
  text: string;
  scopes: string[];
  startIndex: number;
  endIndex: number;
  defaultThemeTokenData: grvsc.gql.GRVSCThemeTokenData;
  additionalThemeTokenData: grvsc.gql.GRVSCThemeTokenData[];
}

interface MDASTNode {
  type: string;
  lang?: string;
  meta?: string;
  value?: string;
  children?: MDASTNode[];
}

interface MarkdownNode extends grvsc.gql.Node {
  fileAbsolutePath: string;
}

type Line = {
  text: string;
  attrs: object;
  data: object;
};

interface CodeBlockRegistry<TKey> {
  register: (key: TKey, data: Omit<RegisteredCodeBlockData, 'index'>) => void;
  forEachLine: (codeBlockKey: TKey, action: (line: Line, index: number, lines: Line[]) => void) => void;
  forEachToken: (
    key: TKey,
    lineIndex: number,
    tokenAction: (token: RegisteredToken) => void
  ) => void;
  forEachCodeBlock: (action: (data: RegisteredCodeBlockData & { index: number }, codeBlockKey: TKey) => void) => void;
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

    interface HighlightArgs {
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