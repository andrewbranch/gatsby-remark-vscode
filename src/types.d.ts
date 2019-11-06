interface RemarkPluginArguments {
  cache: GatsbyCache;
  markdownAST: any;
  markdownNode: any;
  actions: any;
  createNodeId: (key: string) => string;
}

interface ExtensionDemand {
  identifier: string;
  version: string;
}

interface CodeFenceData {
  language: string;
  markdownNode: any;
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
  codeFenceOptions: object;
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
  wrapperClassName?: string;
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

interface GatsbyCache {
  get(key: string): Promise<any>;
  set(key: string, data: any): Promise<void>;
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
  codeFenceOptions: object;
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

type ElementTemplate = {
  tagName: string;
  attributes: Record<string, string>;
  children: (ElementTemplate | string)[];
  renderOptions?: RenderOptions;
};

// Utils

interface RenderOptions {
  whitespace?: number;
}
