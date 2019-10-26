import { HTMLAttributes } from '@types/react'

interface LineTransformerArgs {
  lineText: string;
  language: string;
  attrs: HTMLAttributes;
  state: HighlightDirectiveTransfomerState;
}

interface LineTransformer {
  (args: LineTransformerArgs): {
    lineText: string;
    attrs: HTMLAttributes;
    state: HighlightDirectiveTransfomerState;
  };
}

type HighlightDirectiveTransfomerState = {
  inHighlightRange?: boolean;
  highlightNextLine?: boolean;
};

function createHighlightDirectiveLineTransformer(): LineTransformer<T> {
  return ({ lineText, attrs, language, state }) => {
    //     directiveText = getCommentForLanguage(language, directiveText)
    const commentFn = getCommentForLanguage(language)
    if (lineText.endsWith(commentFn('highlight-start'))) {
      return { state: { inHighlightRange: true } }; // no `line` - drop this line from output
    }
    if (lineText.endsWith(commentFn('highlight-end'))) {
      return { state: { inHighlightRange: false } }; // again no `line`
    }
    if (lineText.endsWith(commentFn('highlight-next-line'))) {
      return { state: { highlightNextLine: true } }; // again no `line`
    }
    if (lineText.endsWith(commentFn('highlight-line')) || state && state.inHighlightRange) {
      // return attrs with added class name, text with comment removed, current state
      return {
        lineText: lineText.replace(commentFn('highlight-line'), ''),
        attrs: addClassName(attrs, highlightClassName),
      };
    }
    if (state && state.highlightNextLine) {
      // return unchanged text, attrs with added class name, and state with highlightNextLine set
      // to false but preserve inHighlightRange so that a misplaced 'highlight-next-line'
      // doesn't disrupt a highlight range
      return { lineText, attrs: addClassName(attrs, highlightClassName), state: { ...state, highlightNextLine: false } }
    }
    return { lineText, attrs, state }; // default: don’t change anything, propagate state to next call
  };
}

module.exports = createHighlightDirectiveTransformer