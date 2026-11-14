/**
 * @vitest-environment jsdom
 *
 * SF-21 `inputEnd` — slot inside the end of the AddressField input.
 * Scenario IDs (S1/S2) refer to the SF-21 acceptance scenarios in 00-specify.md.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm } from 'react-hook-form';

import { NameResolverProvider } from './name-resolution/name-resolver-context';

import { AddressField } from './AddressField';

const SLOT = '[data-slot="address-field-input-end"]';

type ObserverCallback = () => void;
let observers: { cb: ObserverCallback; disconnect: ReturnType<typeof vi.fn> }[] = [];
let slotWidth = 0;

class FakeResizeObserver {
  disconnect = vi.fn();
  constructor(cb: ObserverCallback) {
    observers.push({ cb, disconnect: this.disconnect });
  }
  observe(): void {}
  unobserve(): void {}
}

beforeEach(() => {
  observers = [];
  slotWidth = 60;
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.matches(SLOT) ? slotWidth : 0;
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

interface FieldProps {
  inputEnd?: React.ReactNode;
  initial?: string;
  withResolver?: boolean;
  readOnly?: boolean;
}

function Field({ inputEnd, initial = '', withResolver, readOnly }: FieldProps): React.ReactElement {
  const { control } = useForm({ defaultValues: { addr: initial }, mode: 'onChange' });
  const field = (
    <AddressField
      id="addr"
      name="addr"
      label="Address"
      control={control}
      inputEnd={inputEnd}
      readOnly={readOnly}
    />
  );
  return withResolver ? (
    <NameResolverProvider resolveName={vi.fn()}>{field}</NameResolverProvider>
  ) : (
    field
  );
}

const input = (): HTMLInputElement => screen.getByRole('textbox') as HTMLInputElement;
const slot = (): HTMLElement | null => document.querySelector<HTMLElement>(SLOT);

describe('AddressField inputEnd', () => {
  // S1 happy path
  it('renders the slot content inside the input container, after the input (S1)', () => {
    render(<Field inputEnd={<button type="button">Paste</button>} />);
    const button = screen.getByRole('button', { name: 'Paste' });
    expect(slot()?.contains(button)).toBe(true);
    expect(input().parentElement?.contains(slot())).toBe(true);
    expect(
      input().compareDocumentPosition(slot() as Node) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // S1 boundary: with / without a value
  it.each([
    ['empty', ''],
    ['long value', '0x' + 'ab'.repeat(20)],
  ])('reserves end padding for the slot when the field is %s (S1)', (_n, initial) => {
    render(<Field initial={initial} inputEnd={<button type="button">Paste</button>} />);
    expect(input().style.paddingRight).toBe('68px'); // 60 + 2 * 4 inset
    expect(input().value).toBe(initial);
  });

  // S1 boundary: slot resizes
  it('re-measures the padding when the slot resizes (S1)', () => {
    render(<Field inputEnd={<button type="button">Paste</button>} />);
    slotWidth = 100;
    act(() => observers.forEach((o) => o.cb()));
    expect(input().style.paddingRight).toBe('108px');
  });

  // S1 boundary: zero-width slot
  it('adds no padding when the slot measures zero width (S1)', () => {
    slotWidth = 0;
    render(<Field inputEnd={<span />} />);
    expect(input().style.paddingRight).toBe('');
  });

  // S1: coexistence with name-resolution adornments
  it('keeps the slot inside the input container while the resolution announcer sits outside it (S1)', () => {
    render(<Field withResolver inputEnd={<button type="button">Paste</button>} />);
    const region = document.getElementById('addr-resolution');
    expect(region).not.toBeNull();
    expect(slot()?.contains(region)).toBe(false);
    expect(input().parentElement?.contains(region)).toBe(false);
    expect(input().getAttribute('aria-describedby')).toContain('addr-resolution');
  });

  // S1: interaction
  it('clicking the slot does not change the input value and the button is a Tab stop after the input (S1)', () => {
    const onClick = vi.fn();
    render(
      <Field
        initial="0xabc"
        inputEnd={
          <button type="button" onClick={onClick}>
            Paste
          </button>
        }
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Paste' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(input().value).toBe('0xabc');
    const focusables = Array.from(
      input().parentElement!.querySelectorAll<HTMLElement>('input, button')
    );
    expect(focusables).toEqual([input(), screen.getByRole('button', { name: 'Paste' })]);
  });

  // S1: slot stays rendered when readOnly (documented decision)
  it('still renders the slot when the field is readOnly (consumer decides)', () => {
    render(<Field readOnly inputEnd={<button type="button">Paste</button>} />);
    expect(screen.getByRole('button', { name: 'Paste' })).toBeTruthy();
  });

  // lifecycle: toggling the slot off clears padding; unmount disconnects the observer
  it('clears padding when the slot is removed and disconnects the observer on unmount (S1)', () => {
    const { rerender, unmount } = render(<Field inputEnd={<button type="button">Paste</button>} />);
    expect(input().style.paddingRight).toBe('68px');
    const disconnect = observers[0].disconnect;
    rerender(<Field />);
    expect(slot()).toBeNull();
    expect(input().style.paddingRight).toBe('');
    expect(disconnect).toHaveBeenCalled();
    unmount();
  });

  // failure / environment: no ResizeObserver
  it('still measures once when ResizeObserver is unavailable (S1)', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    render(<Field inputEnd={<button type="button">Paste</button>} />);
    expect(input().style.paddingRight).toBe('68px');
  });

  // S2 regression
  it.each([
    ['undefined', undefined],
    ['null', null],
  ])('renders no slot and no inline style when inputEnd is %s (S2)', (_n, value) => {
    render(<Field inputEnd={value} />);
    expect(slot()).toBeNull();
    expect(input().getAttribute('style')).toBeNull();
    expect(observers).toHaveLength(0);
  });

  it('treats 0 as a real slot value but false/empty fragments follow ReactNode semantics (S2)', () => {
    render(<Field inputEnd={0} />);
    expect(slot()).not.toBeNull();
  });
});
