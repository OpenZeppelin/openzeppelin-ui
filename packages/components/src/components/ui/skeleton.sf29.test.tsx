/**
 * @vitest-environment jsdom
 *
 * SF-29 · Skeleton. No Invariants stage (Low stakes): properties are the spec acceptance
 * scenarios, labelled P1..P5 below.
 *   P1 animates: pulse animation class is present on every shape
 *   P2 reduced motion: `motion-reduce:animate-none` accompanies the animation class
 *   P3 hidden from the a11y tree: aria-hidden="true", not overridable by callers
 *   P4 shapes and sizing: preset classes; size comes from className/style
 *   P5 element contract: ref, className merge, passthrough, no children, export
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createRef } from 'react';

import * as ui from './index';
import { Skeleton, type SkeletonShape } from './skeleton';

const SHAPES: SkeletonShape[] = ['text', 'rect', 'circle'];

afterEach(cleanup);

function block(testId = 'sk'): HTMLElement {
  return screen.getByTestId(testId);
}

/** Asserts every class is present (jest-dom matchers are not installed in this package). */
function expectClasses(el: HTMLElement, ...classes: string[]): void {
  for (const c of classes) expect(el.classList.contains(c), `missing class ${c}`).toBe(true);
}

describe('Skeleton (SF-29)', () => {
  describe('P1 animates', () => {
    it.each(SHAPES)('%s shape carries the pulse animation', (shape) => {
      render(<Skeleton shape={shape} data-testid="sk" />);
      expectClasses(block(), 'animate-pulse');
    });

    it('default shape pulses', () => {
      render(<Skeleton data-testid="sk" />);
      expectClasses(block(), 'animate-pulse');
    });
  });

  describe('P2 reduced motion', () => {
    it.each(SHAPES)('%s shape opts out of animation under reduced motion', (shape) => {
      render(<Skeleton shape={shape} data-testid="sk" />);
      expectClasses(block(), 'motion-reduce:animate-none');
    });

    it('a caller className cannot drop the reduced-motion opt-out', () => {
      render(<Skeleton className="w-1/2 h-8" data-testid="sk" />);
      expectClasses(block(), 'animate-pulse', 'motion-reduce:animate-none');
    });
  });

  describe('P3 hidden from assistive tech', () => {
    it('is aria-hidden and absent from role queries', () => {
      render(<Skeleton data-testid="sk" />);
      expect(block().getAttribute('aria-hidden')).toBe('true');
      expect(block().closest('[aria-hidden="true"]')).toBe(block());
    });

    it.each(SHAPES)('%s shape is aria-hidden', (shape) => {
      render(<Skeleton shape={shape} data-testid="sk" />);
      expect(block().getAttribute('aria-hidden')).toBe('true');
    });

    it('a caller cannot unhide it with aria-hidden={false}', () => {
      render(<Skeleton aria-hidden={false} data-testid="sk" />);
      expect(block().getAttribute('aria-hidden')).toBe('true');
    });

    it('a caller role/aria-label do not expose it (still hidden)', () => {
      render(<Skeleton role="status" aria-label="Loading" data-testid="sk" />);
      expect(block().getAttribute('aria-hidden')).toBe('true');
      expect(screen.queryByRole('status')).toBeNull();
    });
  });

  describe('P4 shapes and sizing', () => {
    it('text is a one-line full-width bar', () => {
      render(<Skeleton shape="text" data-testid="sk" />);
      expectClasses(block(), 'h-4', 'w-full', 'rounded');
    });

    it('rect is rounded and takes size from className', () => {
      render(<Skeleton shape="rect" className="h-24 w-full" data-testid="sk" />);
      expectClasses(block(), 'rounded-md', 'h-24', 'w-full');
    });

    it('circle is fully round and takes size from className', () => {
      render(<Skeleton shape="circle" className="size-12" data-testid="sk" />);
      expectClasses(block(), 'rounded-full', 'size-12');
    });

    it('rect and circle carry no intrinsic height (consumer sizes them)', () => {
      render(
        <>
          <Skeleton shape="rect" data-testid="r" />
          <Skeleton shape="circle" data-testid="c" />
        </>
      );
      for (const id of ['r', 'c']) {
        expect(block(id).className).not.toMatch(/(^|\s)(h|w|size)-/);
      }
    });

    it('className can override the text preset height', () => {
      render(<Skeleton className="h-8" data-testid="sk" />);
      expectClasses(block(), 'h-8');
      expect(block().classList.contains('h-4')).toBe(false);
    });

    it('inline style sizes the block', () => {
      render(<Skeleton shape="rect" style={{ width: 120, height: 40 }} data-testid="sk" />);
      expect(block().style.width).toBe('120px');
      expect(block().style.height).toBe('40px');
    });

    it('uses the muted background token', () => {
      render(<Skeleton data-testid="sk" />);
      expectClasses(block(), 'bg-muted');
    });
  });

  describe('P5 element contract', () => {
    it('renders a div and forwards ref to it', () => {
      const ref = createRef<HTMLDivElement>();
      render(<Skeleton ref={ref} data-testid="sk" />);
      expect(ref.current).toBe(block());
      expect(ref.current?.tagName).toBe('DIV');
    });

    it('passes through id, data-* and style', () => {
      render(<Skeleton id="s1" data-testid="sk" data-extra="x" />);
      expect(block().getAttribute('id')).toBe('s1');
      expect(block().getAttribute('data-extra')).toBe('x');
    });

    it('renders no content', () => {
      render(<Skeleton data-testid="sk" />);
      expect(block().childNodes).toHaveLength(0);
    });

    it('is exported from the ui barrel', () => {
      expect(ui.Skeleton).toBe(Skeleton);
    });

    it('has a displayName', () => {
      expect(Skeleton.displayName).toBe('Skeleton');
    });
  });
});
