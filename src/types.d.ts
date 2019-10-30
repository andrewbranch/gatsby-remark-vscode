interface LineTransformerResult<T> {
  line?: {
    text: string;
    attrs: object;
  };
  state: T | undefined;
}

interface LineTransformerArgs<T> extends LineTransformerResult<T> {
  language: string;
  codeFenceOptions: object;
}

type LineTransformer<T = any> = (args: LineTransformerArgs<T>) => LineTransformerResult<T> | undefined;

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

interface RenderOptions {
  whitespace?: number;
}
