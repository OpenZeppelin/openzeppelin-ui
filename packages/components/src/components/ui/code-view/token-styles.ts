/**
 * The monospace stack the pane pins rather than inheriting, shared with the
 * line-number gutter so a digit column and its code line cannot end up in
 * different faces. Lives here rather than in `CodeView.tsx` because the gutter
 * imports it and `CodeView` imports the gutter.
 */
export const CODE_VIEW_FONT_STACK =
  'font-[ui-monospace,SFMono-Regular,"SF Mono",Consolas,"Liberation Mono",Menlo,monospace]';

/**
 * Maps standard highlight.js token classes to kit tokens without importing a theme stylesheet.
 */
export const CODE_VIEW_TOKEN_STYLE_CLASSES = [
  '[&_.hljs-comment]:text-muted-foreground',
  '[&_.hljs-quote]:text-muted-foreground',
  '[&_.hljs-keyword]:text-primary',
  '[&_.hljs-selector-tag]:text-primary',
  '[&_.hljs-built_in]:text-info',
  '[&_.hljs-type]:text-info',
  '[&_.hljs-string]:text-success',
  '[&_.hljs-regexp]:text-success',
  '[&_.hljs-number]:text-warning',
  '[&_.hljs-literal]:text-warning',
  '[&_.hljs-title]:text-foreground',
  '[&_.hljs-title.function_]:text-foreground',
  '[&_.hljs-title.class_]:text-foreground',
  '[&_.hljs-function]:text-foreground',
  '[&_.hljs-variable]:text-foreground',
  '[&_.hljs-attr]:text-chart-2',
  '[&_.hljs-attribute]:text-chart-2',
  '[&_.hljs-name]:text-chart-3',
  '[&_.hljs-tag]:text-chart-3',
  '[&_.hljs-meta]:text-muted-foreground',
  '[&_.hljs-symbol]:text-destructive',
  '[&_.hljs-bullet]:text-muted-foreground',
  '[&_.hljs-section]:text-primary',
  '[&_.hljs-params]:text-foreground',
  '[&_.hljs-property]:text-chart-4',
  '[&_.hljs-punctuation]:text-muted-foreground',
].join(' ');

/**
 * Private hook for the pane's own layout and for tests, like
 * `CODE_VIEW_REVEAL_ATTRIBUTE`. Not a published class name, not a theme hook,
 * and not part of `CodeViewProps`.
 */
export const CODE_VIEW_GUTTER_ATTRIBUTE = 'data-code-view-gutter';

/**
 * The number lives in an attribute and is painted by `::before`, never as a text
 * node. Three consequences, all of them load-bearing:
 *
 * 1. `pre.textContent` and `code.textContent` still equal `source` exactly, so the
 *    gutter cannot become the hole in SF-3 INV-1 / SF-13 INV-2 source fidelity.
 * 2. CSS generated content is not part of a selection range in any engine, so
 *    selecting a block of code and copying it cannot bring line numbers with it.
 *    `select-none` below is belt-and-braces for a consumer stylesheet that somehow
 *    puts real text here; the guarantee rests on the pseudo-element.
 * 3. No text node per line means no React key churn and no extra reconciliation
 *    beyond the one empty span per line.
 */
export const CODE_VIEW_LINE_ATTRIBUTE = 'data-line';

/**
 * Kit-token paint with a consumer override in front of it.
 *
 * The consumer paints its own code theme through CSS custom properties on a
 * wrapper (SF-3 "apply a highlight.js theme of your own"). A hard-coded token
 * would leave the gutter reading as kit chrome inside someone else's palette, so
 * the colour is a single published custom property that falls back to the kit
 * token when the consumer sets nothing. Inheritance does the rest: setting
 * `--code-view-line-number-color` anywhere above the pane reaches every row.
 *
 * `bg-inherit` rather than `bg-background`: the gutter is `sticky left-0`, so the
 * code slides underneath it during horizontal scroll and the gutter must be
 * opaque. Inheriting the computed background means it stays opaque against
 * whatever the consumer painted the pane, not just against the kit token.
 *
 * `shrink-0` keeps the column at its widest number's width; `text-right` is what
 * makes 9 and 400 share a right edge. Vertical alignment needs nothing: the rows
 * are block boxes in the same `line-height` as the code, so row `n` and code line
 * `n` are the same height and start at the same padding edge.
 */
export const CODE_VIEW_GUTTER_CLASSES = [
  'sticky left-0 shrink-0 select-none bg-inherit pr-3 text-right',
  'text-[var(--code-view-line-number-color,var(--color-muted-foreground))]',
  CODE_VIEW_FONT_STACK,
].join(' ');

/**
 * One row per line. `block` gives it the code's line box; the `::before` paints the
 * digits from the attribute the row carries.
 *
 * The attribute name is spelled out rather than built from `CODE_VIEW_LINE_ATTRIBUTE`
 * for the same reason as the reveal context class: Tailwind scans source text
 * statically and would never see an interpolated class. `token-styles.sf14.test.ts`
 * asserts the two agree.
 */
export const CODE_VIEW_GUTTER_ROW_CLASSES = 'block before:content-[attr(data-line)]';

/**
 * Lines of context the reveal leaves above the range's first line.
 *
 * Not a reversal of the `block: 'start'` fix, a refinement of it. `start` is what
 * gives the range the whole pane instead of the half a centred first line left it
 * (QA A3: 100/56/40/29 percent of a 6/18/25/34-line range visible under `center`).
 * That stays. This only asks the browser to stop a couple of lines short of the
 * top edge, so the range does not sit flush against it with no sign that the file
 * continues above.
 *
 * `scroll-margin-top` rather than geometry in JS: `scrollIntoView` keeps working
 * unchanged and the pane still needs to know nothing about its own height. The
 * mark's scroll box grows upward by this much, so `block: 'start'` lands the top
 * of *that* box on the scrollport edge. Verified in chromium, not assumed:
 * measured 0 / 23 / 45 / 68 px of pane above the range at 0 / 1 / 2 / 3 lh.
 *
 * Two lines, and the unit is `lh` rather than px, because the consumer owns the
 * font size and is reducing it: `lh` resolves against the pane's own line-height,
 * so the gap is two lines of context at any size, and shrinking the font buys the
 * range more room rather than less.
 *
 * Two rather than three is measured, not taste. The gap is unconditional, so it
 * comes off the range's share of the pane, and the bound "a range that fits the
 * pane is fully visible" becomes "a range that fits the pane less this gap". The
 * consumer's own reference range is 18 lines in a 455px pane at 14px/1.625, whose
 * painted mark box is 402.8px: two lines of gap (45px) still fits, three (68px)
 * does not. Three would have regressed the exact case the `start` fix was made
 * for, at the font size in use today. Raising it is one constant, once the
 * consumer's smaller font has made the room.
 *
 * The selector is the private reveal attribute, not `mark`, so a `decorateToken`
 * mark never acquires a scroll margin. It is spelled out rather than built from
 * `CODE_VIEW_REVEAL_ATTRIBUTE`: Tailwind scans source text statically and would
 * not see an interpolated class. `token-styles.sf14.test.ts` asserts the two agree.
 */
export const CODE_VIEW_REVEAL_CONTEXT_LINES = 2;

export const CODE_VIEW_REVEAL_CONTEXT_CLASS = '[&_[data-code-view-reveal]]:scroll-mt-[2lh]';

/**
 * Kit-token paint for `<mark>` inside `.hljs`. Applied only when a reveal range
 * resolved, so omitting `reveal` keeps the same class list as a pane without one.
 *
 * A range resolves to one `<mark>` per token run rather than one per line, so any
 * box-edge accent (border, ring, outline) would repeat at every token boundary.
 * The accent is therefore an underline, which joins across adjacent inline boxes
 * and renders once per revealed line.
 *
 * The wash stays at the low alpha on purpose. Compositing `--selected` over
 * `--background` raises the band's luminance, and the dark palette's `--success`
 * (strings) already sits near 2.3:1 against `--background`; a heavier fill would
 * cost the revealed line the legibility the reveal exists to give it. Visibility
 * comes from the full-opacity underline instead, which costs the tokens nothing.
 */
export const CODE_VIEW_REVEAL_MARK_STYLE_CLASSES = [
  '[&_mark]:bg-selected/15',
  '[&_mark]:text-inherit',
  '[&_mark]:underline',
  '[&_mark]:decoration-selected',
  '[&_mark]:decoration-2',
  '[&_mark]:underline-offset-4',
  CODE_VIEW_REVEAL_CONTEXT_CLASS,
].join(' ');
