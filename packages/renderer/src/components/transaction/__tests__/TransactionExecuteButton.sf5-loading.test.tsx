/**
 * 006 SF-5 INV-10: the renderer's execute button picks up the LoadingButton change with no
 * renderer edit. While submitting with a valid form it takes the loading path (focusable,
 * aria-disabled, aria-busy, clicks cancelled). When the form is invalid it stays natively
 * disabled, as before.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionExecuteButton } from '../TransactionExecuteButton';

describe('SF-5 INV-10: TransactionExecuteButton with the new LoadingButton', () => {
  it('submitting with a valid form: busy and aria-disabled, not natively disabled, submit cancelled', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <TransactionExecuteButton isWalletConnected isSubmitting isFormValid />
      </form>
    );
    const button = screen.getByRole('button', { name: 'Executing...' }) as HTMLButtonElement;
    expect(button.type).toBe('submit');
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('idle with a valid form: enabled, submits on click', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <TransactionExecuteButton isWalletConnected isSubmitting={false} isFormValid />
      </form>
    );
    const button = screen.getByRole('button', { name: 'Execute Transaction' }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('invalid form: natively disabled whether or not it is submitting', () => {
    const { rerender } = render(
      <TransactionExecuteButton isWalletConnected isSubmitting={false} isFormValid={false} />
    );
    const idle = screen.getByRole('button') as HTMLButtonElement;
    expect(idle.disabled).toBe(true);
    expect(idle.hasAttribute('aria-busy')).toBe(false);

    rerender(<TransactionExecuteButton isWalletConnected isSubmitting isFormValid={false} />);
    const busy = screen.getByRole('button') as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    expect(busy.getAttribute('aria-busy')).toBe('true');
  });

  it('wallet not connected and not local: natively disabled', () => {
    render(<TransactionExecuteButton isWalletConnected={false} isSubmitting={false} isFormValid />);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
