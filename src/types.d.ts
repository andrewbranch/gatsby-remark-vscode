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
