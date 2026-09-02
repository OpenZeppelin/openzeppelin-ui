import React from 'react';

import {
  CODE_VIEW_GUTTER_ATTRIBUTE,
  CODE_VIEW_GUTTER_CLASSES,
  CODE_VIEW_GUTTER_ROW_CLASSES,
  CODE_VIEW_LINE_ATTRIBUTE,
} from './token-styles';

interface LineNumberGutterProps {
  /** Number of rows to paint. Always `countSourceLines(source)`, never a guess. */
  readonly lineCount: number;
}

/**
 * The 1-indexed line-number column, rendered beside the code rather than inside it.
 *
 * Beside, not inside, because a range resolves to one `<mark>` per token run and a
 * run may span several lines. Wrapping every line in a block element to hang a CSS
 * counter off it — the rehype-pretty-code shape — would force those marks to be
 * split per line, which is a rewrite of the reveal render path and of the
 * documented mark granularity. A sibling column needs neither: `render-hast` is
 * untouched and the marks keep the shape `token-styles.ts` describes.
 *
 * What a sibling column costs is exactness under soft wrapping: rows are one
 * logical line tall, so a code line that wraps to two visual lines would push the
 * code out of step with the column below it (measured in chromium: a 400-character
 * line under `pre-wrap` takes 10 line boxes while its row takes 1). The pane paints
 * `whitespace-pre` and exposes no wrapping prop, so within `CodeView`'s own
 * contract the two cannot disagree; a consumer stylesheet that forces wrapping is
 * outside it, and the docs say so.
 *
 * `React.memo` on the line count, not on `source`: editing a line without adding
 * one leaves this column identical, and a 770-line file is 770 spans.
 */
export const LineNumberGutter = React.memo(function LineNumberGutter({
  lineCount,
}: LineNumberGutterProps): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      {...{ [CODE_VIEW_GUTTER_ATTRIBUTE]: '' }}
      className={CODE_VIEW_GUTTER_CLASSES}
    >
      {Array.from({ length: lineCount }, (_, index) => (
        <span
          key={index}
          {...{ [CODE_VIEW_LINE_ATTRIBUTE]: index + 1 }}
          className={CODE_VIEW_GUTTER_ROW_CLASSES}
        />
      ))}
    </span>
  );
});
