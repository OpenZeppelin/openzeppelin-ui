/**
 * SF-13 · SF-14 · Browser verification — reveal geometry (QA A3) and gutter alignment.
 * Opt-in via `pnpm test:browser`. Not part of the default jsdom `pnpm test`.
 *
 * Why this cannot be a jsdom test: jsdom has no layout, so every rect is zero and
 * `scrollIntoView` is a no-op. The jsdom suite can only assert *which* element is
 * scrolled and *with which options* (`interaction.sf13.test.tsx`), and *what the gutter
 * puts in the DOM* (`line-numbers.sf14.test.tsx`). Whether the range ends up visible and
 * whether row `n` lands on code line `n` are layout questions, so they need a real engine.
 *
 * QA A3 background. The scroll target is the FIRST kit mark, which is a token run on
 * the range's first line. Under `block: 'center'` that first line was anchored to the
 * pane's midpoint, leaving only half the pane height for the rest of the range, so a
 * range taller than half the pane ran off the bottom.
 *
 * Seen to fail: with `block: 'center'` restored in `CodeView.tsx`, this file reports
 * 100 / 62 / 44 / 32 percent of the range visible at 6 / 18 / 25 / 34 lines, with 231px
 * of empty pane above it — reproducing the sweep's app measurements of 100 / 56 / 40 /
 * 29 percent and ~208px. Every assertion in the first two describes fails on 'center'.
 *
 * SF-14 changed one thing about that geometry and nothing else. `block: 'start'` still
 * decides how much pane the range gets; a `scroll-margin-top` of
 * `CODE_VIEW_REVEAL_CONTEXT_LINES` lines on the mark now holds the range that far below
 * the top edge, so it does not sit flush against it. Measured here across gap sizes at
 * this pane, as fraction of the range visible at 6 / 18 / 25 / 34 / 60 lines:
 *
 *   0 lines  100 / 100 /  85 /  62 /  35 %,   0px above
 *   1 line   100 / 100 /  81 /  59 /  34 %,  23px above
 *   2 lines  100 / 100 /  77 /  57 /  32 %,  45px above   <- shipped
 *   3 lines  100 / 100 /  73 /  54 /  30 %,  68px above
 *   4 lines  100 /  96 /  69 /  51 /  29 %,  91px above
 *
 * Two is the shipped value because the gap is unconditional: it comes off the range's
 * share of the pane, so "a range that fits is fully visible" becomes "a range that fits
 * the pane less the gap". The consumer's own reference range is 18 lines, whose painted
 * mark box is 402.8px here, and the rows above are where that stops fitting.
 *
 * Tailwind is not compiled in the browser suite, so the pane's own utility classes do
 * not apply and the stylesheet below hand-implements the handful it depends on.
 * Deliberately keyed on the real class names rather than on `pre` / `code` / the gutter
 * attribute: a rule written against the element would go on applying after the component
 * stopped emitting the class, and every layout assertion here would keep passing against
 * scaffolding rather than against the component. Keyed this way, dropping `sticky` from
 * the gutter really does unpin it and dropping the context class really does close the
 * gap, which is what makes the `Seen to fail` notes below true.
 *
 * Only what the consuming app supplies — the host's height, and the face, size and
 * leading the pane inherits — is written against elements. `PANE_SCROLLPORT` is 479 and
 * not 455 because Tailwind's preflight `box-sizing: border-box` is absent too, so the
 * pane's `height: 100%` is 455px of content plus its own 24px of padding.
 */
import { cleanup, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { CodeView } from '../CodeView';
import {
  CODE_VIEW_GUTTER_CLASSES,
  CODE_VIEW_GUTTER_ROW_CLASSES,
  CODE_VIEW_REVEAL_CONTEXT_CLASS,
  CODE_VIEW_REVEAL_CONTEXT_LINES,
} from '../token-styles';

/** Compound selector matching an element that carries every class in `classes`. */
function classSelector(classes: string): string {
  return classes
    .split(' ')
    .map((name) => `.${CSS.escape(name)}`)
    .join('');
}

/** Tall enough that a 20-line range overflows it, matching the app's drawer pane. */
const PANE_HEIGHT = 455;
const TOTAL_LINES = 400;
const HOST_ID = 'code-view-geometry-host';

const FONT_SIZE = 14;
const LINE_HEIGHT_RATIO = 1.625;
/** One text line at the stylesheet below. */
const LINE_HEIGHT = FONT_SIZE * LINE_HEIGHT_RATIO;
/** Content height plus the pane's own 12px of padding on each edge. See the header. */
const PANE_SCROLLPORT = PANE_HEIGHT + 24;
/** The gap the pane holds above a revealed range, in pixels at this font size. */
const CONTEXT_GAP = CODE_VIEW_REVEAL_CONTEXT_LINES * LINE_HEIGHT;
/** Sub-pixel rounding, plus chromium resolving `lh` a fraction under `LINE_HEIGHT`. */
const TOLERANCE = 4;

/** Lines wide enough to tokenize into several runs, so a range yields several marks. */
const SOURCE = Array.from(
  { length: TOTAL_LINES },
  (_, index) => `fn line_${String(index + 1).padStart(3, '0')}() { let value = ${index + 1}; }`
).join('\n');

let styleElement: HTMLStyleElement;

beforeAll(() => {
  styleElement = document.createElement('style');
  const scoped = (selector: string) => `#${HOST_ID} ${selector}`;
  styleElement.textContent = `
    #${HOST_ID} { height: ${PANE_HEIGHT}px; display: flex; }

    /* Supplied by the app, not by the component: the pane fills its host and inherits
       the face, size and leading the consumer chose. */
    #${HOST_ID} pre { margin: 0; height: 100%; flex: 1 1 0%; font-family: monospace; }
    #${HOST_ID} [data-code-view-gutter] { font-family: monospace; }

    /* The component's own utilities, one rule per class it actually emits. */
    ${scoped('.overflow-auto')} { overflow: auto; }
    ${scoped('.p-3')} { padding: 12px; }
    ${scoped('.text-sm')} { font-size: ${FONT_SIZE}px; }
    ${scoped('.leading-relaxed')} { line-height: ${LINE_HEIGHT_RATIO}; }
    ${scoped('.flex')} { display: flex; }
    ${scoped('.items-start')} { align-items: flex-start; }
    ${scoped('.block')} { display: block; }
    ${scoped('.whitespace-pre')} { white-space: pre; }
    ${scoped('.min-w-full')} { min-width: 100%; }
    ${scoped('.flex-1')} { flex: 1 1 0%; }
    ${scoped('.sticky')} { position: sticky; }
    ${scoped('.left-0')} { left: 0; }
    ${scoped('.shrink-0')} { flex-shrink: 0; }
    ${scoped('.select-none')} { user-select: none; }
    ${scoped('.bg-inherit')} { background-color: inherit; }
    ${scoped('.pr-3')} { padding-right: 12px; }
    ${scoped('.text-right')} { text-align: right; }
    ${scoped(`${classSelector(CODE_VIEW_GUTTER_ROW_CLASSES)}::before`)} {
      content: attr(data-line);
    }
    ${scoped(`${classSelector(CODE_VIEW_REVEAL_CONTEXT_CLASS)} [data-code-view-reveal]`)} {
      scroll-margin-top: ${CODE_VIEW_REVEAL_CONTEXT_LINES}lh;
    }
  `;

  document.head.append(styleElement);
});

afterAll(() => {
  styleElement.remove();
});

afterEach(cleanup);

interface RevealGeometry {
  /** Fraction of the range's painted height that lies inside the pane, 0 to 1. */
  readonly visibleFraction: number;
  /** Pane pixels above the range's first mark. The context gap, once it is honoured. */
  readonly emptyAbove: number;
  /** Pane pixels the range actually occupies. Caps at the pane's own height. */
  readonly visiblePixels: number;
  /** Painted height of the whole range, mark box to mark box. */
  readonly rangePixels: number;
}

function renderPane(startLine: number, endLine: number, showLineNumbers = false): HTMLPreElement {
  const { container } = render(
    <div id={HOST_ID}>
      <CodeView
        source={SOURCE}
        language="rust"
        reveal={{ startLine, endLine }}
        showLineNumbers={showLineNumbers}
      />
    </div>
  );

  const pane = container.querySelector('pre');
  if (!pane) {
    throw new Error('CodeView must render a pre');
  }
  return pane;
}

function measureReveal(
  startLine: number,
  endLine: number,
  showLineNumbers = false
): RevealGeometry {
  const pane = renderPane(startLine, endLine, showLineNumbers);

  const marks = [...pane.querySelectorAll('[data-code-view-reveal]')];
  expect(
    marks.length,
    'the range must resolve, or this measurement proves nothing'
  ).toBeGreaterThan(0);

  const paneRect = pane.getBoundingClientRect();
  const rects = marks.map((mark) => mark.getBoundingClientRect());
  const rangeTop = Math.min(...rects.map((rect) => rect.top));
  const rangeBottom = Math.max(...rects.map((rect) => rect.bottom));

  const visible = Math.max(
    0,
    Math.min(rangeBottom, paneRect.bottom) - Math.max(rangeTop, paneRect.top)
  );

  return {
    visibleFraction: visible / (rangeBottom - rangeTop),
    emptyAbove: rangeTop - paneRect.top,
    visiblePixels: visible,
    rangePixels: rangeBottom - rangeTop,
  };
}

describe('INV-11 / QA A3: reveal geometry is driven by the range, not by its first line', () => {
  it.each([
    ['6-line', 201, 206],
    ['18-line', 201, 218],
  ])(
    '%s range fits the pane beneath the context gap and is brought fully into view',
    (_label, startLine, endLine) => {
      const geometry = measureReveal(startLine, endLine);

      expect(
        geometry.rangePixels + CONTEXT_GAP,
        'this case is only meaningful while the range still fits below the gap'
      ).toBeLessThan(PANE_SCROLLPORT);

      expect(geometry.visibleFraction).toBe(1);
    }
  );

  it.each([
    ['25-line', 201, 225],
    ['34-line', 201, 234],
    ['60-line', 201, 260],
  ])('%s range is too tall to fit and takes the whole pane below the gap', (_label, start, end) => {
    expect(
      (end - start + 1) * LINE_HEIGHT,
      'this case is only meaningful while the range overflows the pane'
    ).toBeGreaterThan(PANE_SCROLLPORT);

    const geometry = measureReveal(start, end);

    // A range taller than the pane can never be fully visible, so the fraction is not
    // the property to assert. The property is that it wastes nothing: below the context
    // gap, the range fills the pane. Under 'center' the visible slice was capped at half
    // the pane height, because the first line sat at the midpoint and the top half was
    // empty — an order of magnitude more waste than the two lines held back here.
    expect(geometry.visiblePixels).toBeGreaterThan(PANE_SCROLLPORT - CONTEXT_GAP - TOLERANCE);
  });
});

/**
 * SF-14. The gap is the whole change to this geometry, so it gets its own assertions
 * rather than being folded into a widened tolerance on the ones above — a tolerance
 * loose enough to cover 45px would no longer notice a regression back to `center`.
 *
 * Seen to fail: dropping `CODE_VIEW_REVEAL_CONTEXT_CLASS` from
 * `CODE_VIEW_REVEAL_MARK_STYLE_CLASSES` reports 0px above at every range height, and
 * every case below fails while the two describes above still pass.
 */
describe('SF-14: the reveal holds a fixed number of lines of context above the range', () => {
  it.each([
    ['6-line', 201, 206],
    ['18-line', 201, 218],
    ['25-line', 201, 225],
    ['34-line', 201, 234],
    ['60-line', 201, 260],
  ])('leaves a %s range exactly the context gap of pane above it', (_label, start, end) => {
    const { emptyAbove } = measureReveal(start, end);

    expect(emptyAbove).toBeGreaterThan(CONTEXT_GAP - TOLERANCE);
    expect(
      emptyAbove,
      'QA A3: a centred first line left ~231px unused; the gap is a fixed few lines, not half a pane'
    ).toBeLessThan(CONTEXT_GAP + TOLERANCE);
  });

  it('does not push the range down when it starts within the gap of the top of the file', () => {
    const { emptyAbove } = measureReveal(1, 6);

    expect(
      emptyAbove,
      'there is nothing to scroll to above line 1, so the pane stays at its top'
    ).toBeLessThan(TOLERANCE + 12);
  });
});

/**
 * SF-14. jsdom proves the numbers are in attributes rather than text nodes; only a
 * layout engine can prove they land on the right lines and stay put.
 *
 * Seen to fail: dropping `sticky left-0` from the gutter's classes fails the pinning
 * case (the column scrolls away with the code); leaving the code on `min-w-full` beside
 * the column fails the no-spurious-scroll case by exactly the gutter's width.
 */
describe('SF-14: the gutter aligns with the code and stays pinned', () => {
  /**
   * The stylesheet in `beforeAll` is keyed on class names, so it paints nothing unless
   * the component really emits them. This is the case that says so out loud: if the
   * gutter stopped carrying its class list, every measurement below would quietly be
   * measuring an unstyled span instead of failing.
   */
  it('renders a column carrying every class the layout rules are keyed on', () => {
    const pane = renderPane(201, 218, true);
    const gutter = pane.querySelector(classSelector(CODE_VIEW_GUTTER_CLASSES));

    expect(
      gutter,
      `expected a gutter matching ${classSelector(CODE_VIEW_GUTTER_CLASSES)}`
    ).not.toBeNull();
    expect(gutter?.getAttribute('data-code-view-gutter')).toBe('');
    expect(pane.querySelectorAll(classSelector(CODE_VIEW_GUTTER_ROW_CLASSES))).toHaveLength(
      TOTAL_LINES
    );
  });

  function rowRect(pane: HTMLPreElement, line: number): DOMRect {
    const gutter = pane.querySelector('[data-code-view-gutter]');
    const row = gutter?.children[line - 1];
    if (!(row instanceof HTMLElement)) {
      throw new Error(`no gutter row for line ${line}`);
    }
    return row.getBoundingClientRect();
  }

  it.each([1, 2, 200, 400])('puts row %i on the same baseline as its code line', (line) => {
    const pane = renderPane(201, 218, true);
    const codeTop = pane.querySelector('code')!.getBoundingClientRect().top;

    expect(rowRect(pane, line).top - codeTop).toBeCloseTo((line - 1) * LINE_HEIGHT, 1);
  });

  it('gives every row the code line-height, so drift cannot accumulate down the file', () => {
    const pane = renderPane(201, 218, true);

    for (const line of [1, 50, 399, 400]) {
      expect(rowRect(pane, line).height).toBeCloseTo(LINE_HEIGHT, 1);
    }
  });

  it('keeps the column at the left edge of the scrollport while the code scrolls under it', () => {
    // The shared fixture's lines are short enough to fit any viewport this suite runs
    // in, so it cannot scroll horizontally and could not prove anything here.
    const wide = `${'fn wide() { let value = "'}${'x'.repeat(600)}"; }\nfn after() {}`;
    const { container } = render(
      <div id={HOST_ID}>
        <CodeView source={wide} language="rust" showLineNumbers />
      </div>
    );
    const pane = container.querySelector('pre')!;
    const gutter = pane.querySelector('[data-code-view-gutter]') as HTMLElement;

    const restingLeft = gutter.getBoundingClientRect().left;
    expect(pane.scrollWidth, 'the long line must overflow, or this proves nothing').toBeGreaterThan(
      pane.clientWidth
    );

    pane.scrollLeft = 200;
    expect(pane.scrollLeft, 'the pane must actually scroll, or this proves nothing').toBe(200);

    expect(gutter.getBoundingClientRect().left).toBeCloseTo(restingLeft, 1);
  });

  it('adds no horizontal scroll to a file whose lines already fit', () => {
    const { container } = render(
      <div id={HOST_ID}>
        <CodeView source={'one\ntwo\nthree'} language="plaintext" showLineNumbers />
      </div>
    );
    const pane = container.querySelector('pre')!;

    expect(
      pane.scrollWidth,
      'a code element still sized `min-w-full` beside the column would overflow by its width'
    ).toBeLessThanOrEqual(pane.clientWidth);
  });

  it('leaves the reveal geometry identical to a pane without the column', () => {
    const withoutGutter = measureReveal(201, 218, false);
    cleanup();
    const withGutter = measureReveal(201, 218, true);

    expect(withGutter.emptyAbove).toBeCloseTo(withoutGutter.emptyAbove, 1);
    expect(withGutter.visibleFraction).toBeCloseTo(withoutGutter.visibleFraction, 3);
  });
});
