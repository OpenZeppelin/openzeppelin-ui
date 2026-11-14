/**
 * @vitest-environment node
 *
 * Input adornments render on the server: no `window`, no ResizeObserver, no layout. The
 * markup has the wrapper and both slots, and the input carries no measured padding until
 * the client measures.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

import { Input } from './input';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Input server render', () => {
  it('runs without window or ResizeObserver', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof ResizeObserver).toBe('undefined');
  });

  it('adorned markup has the wrapper, both slots and an unpadded input', () => {
    const error = vi.spyOn(console, 'error');
    const html = renderToString(<Input startAdornment={<svg />} endAdornment="USD" />);
    expect(html).toMatch(/^<div data-slot="input-wrapper" class="relative flex w-full">/);
    const order = [...html.matchAll(/data-slot="([^"]+)"/g)].map((m) => m[1]);
    expect(order).toEqual([
      'input-wrapper',
      'input-start-adornment',
      'input',
      'input-end-adornment',
    ]);
    expect(html).toContain('>USD</span>');
    const input = /<input[^>]*>/.exec(html)?.[0] ?? '';
    expect(input).not.toMatch(/padding/);
    expect(error).not.toHaveBeenCalled();
  });

  it("boundary: the caller's style survives on the server, unpadded", () => {
    const html = renderToString(<Input endAdornment="USD" style={{ color: 'red' }} />);
    const input = /<input[^>]*>/.exec(html)?.[0] ?? '';
    expect(input).toContain('style="color:red"');
  });

  it('plain path on the server is a bare <input>', () => {
    const html = renderToString(<Input endAdornment={null} placeholder="x" />);
    expect(html).toMatch(/^<input [^>]*\/>$/);
    expect(html).not.toContain('adornment');
  });
});
