/**
 * @vitest-environment jsdom
 *
 * SF-3 · Interaction — INV-7.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CodeView } from '../CodeView';
import { getScrollRegion, readDeployShFixture } from './helpers';

describe('INV-7: browser-native code navigation remains intact', () => {
  it('exposes a sequentially focusable pre with native overflow scrolling', () => {
    const { container } = render(
      <div>
        <input data-testid="wizard-field" />
        <CodeView source={readDeployShFixture()} language="shell" />
      </div>
    );
    const field = container.querySelector('[data-testid="wizard-field"]') as HTMLInputElement;
    const pre = getScrollRegion(container);
    field.focus();
    expect(document.activeElement).toBe(field);
    pre.focus();
    expect(document.activeElement).toBe(pre);
    expect(pre.className).toContain('overflow-auto');
  });

  it('installs no keyboard, clipboard, selection, or scroll listeners on the scroll region', () => {
    const listenerProps = [
      'onKeyDown',
      'onKeyUp',
      'onCopy',
      'onCut',
      'onPaste',
      'onScroll',
      'onWheel',
      'onPointerDown',
      'onFocus',
      'onBlur',
    ] as const;
    const { container } = render(<CodeView source={'line\n'.repeat(40)} language="plaintext" />);
    const pre = getScrollRegion(container);
    for (const prop of listenerProps) {
      expect(pre[prop] ?? null, `${prop} must not be attached by CodeView`).toBeNull();
    }
  });

  it('does not move focus when source updates underneath an external focused field', () => {
    const view = render(
      <div>
        <input data-testid="wizard-field" defaultValue="" />
        <CodeView source="first" language="plaintext" />
      </div>
    );
    const field = view.getByTestId('wizard-field') as HTMLInputElement;
    field.focus();
    view.rerender(
      <div>
        <input data-testid="wizard-field" defaultValue="" />
        <CodeView source="second" language="plaintext" />
      </div>
    );
    expect(document.activeElement).toBe(field);
    fireEvent.change(field, { target: { value: 'typing' } });
    expect(document.activeElement).toBe(field);
  });
});
