/**
 * @vitest-environment jsdom
 *
 * SF-25 · RadioField option descriptions and card variant. No Invariants stage (Low stakes):
 * properties are the spec acceptance scenarios, labelled P1..P5 below.
 *   P1 described options in the card variant show their description (name != description)
 *   P2 card variant in a form: required error, then submitted value
 *   P3 card and default variants agree on validation and submitted value
 *   P4 options without descriptions render as before (no description nodes, describedby unchanged)
 *   P5 default variant links a description to its radio; disabled options stay inert
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm } from 'react-hook-form';

import { RadioField, type RadioFieldProps, type RadioOption } from './RadioField';

// Radix's form-bubble input (rendered because the group is `required`) measures itself.
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  }
});

interface Values {
  plan: string;
}

const described: RadioOption[] = [
  { value: 'starter', label: 'Starter', description: 'For trying things out' },
  { value: 'team', label: 'Team', description: 'Shared access for small teams' },
  { value: 'enterprise', label: 'Enterprise', description: 'Contact sales', disabled: true },
];

const plain: RadioOption[] = [
  { value: 'starter', label: 'Starter' },
  { value: 'team', label: 'Team' },
];

type HarnessProps = Partial<Omit<RadioFieldProps<Values>, 'control' | 'name' | 'id'>> & {
  onSubmit?: (values: Values) => void;
};

// `noValidate` mirrors the renderer's TransactionForm. jsdom enforces native validity on Radix's
// hidden `required` input and blocks submit before react-hook-form runs; Chromium does not (proved in
// the running app, see the SF-25 proof folder), so the jsdom suite opts out to test the field contract.
function Harness({ onSubmit = () => undefined, options = described, ...rest }: HarnessProps) {
  const form = useForm<Values>({ defaultValues: { plan: '' }, mode: 'onSubmit' });
  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <RadioField<Values>
        id="plan"
        name="plan"
        label="Plan"
        control={form.control}
        options={options}
        {...rest}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

const checkedValues = () =>
  screen
    .getAllByRole('radio')
    .filter((r) => (r as HTMLInputElement).checked || r.getAttribute('aria-checked') === 'true')
    .map((r) => r.getAttribute('value'));

describe('RadioField option descriptions and card variant (SF-25)', () => {
  describe('P1 card variant shows descriptions', () => {
    it('renders every option description as visible text', () => {
      render(<Harness variant="card" />);
      for (const o of described) {
        expect(screen.getByText(o.description as string)).toBeTruthy();
      }
    });

    it('names each radio by its label and describes it by its description', () => {
      render(<Harness variant="card" />);
      const starter = screen.getByRole('radio', { name: 'Starter' });
      const describedBy = starter.getAttribute('aria-describedby') as string;
      expect(document.getElementById(describedBy)?.textContent).toBe('For trying things out');
    });

    it('keeps the description out of the accessible name', () => {
      render(<Harness variant="card" />);
      expect(screen.queryByRole('radio', { name: /For trying things out/ })).toBeNull();
    });

    it('renders as a radiogroup with one radio per option', () => {
      render(<Harness variant="card" />);
      expect(screen.getByRole('radiogroup')).toBeTruthy();
      expect(screen.getAllByRole('radio')).toHaveLength(described.length);
    });

    it('shows helper text alongside the cards', () => {
      render(<Harness variant="card" helperText="Pick one plan" />);
      expect(screen.getByText('Pick one plan')).toBeTruthy();
    });

    it('tolerates a mix of described and undescribed options', () => {
      render(
        <Harness
          variant="card"
          options={[
            { value: 'a', label: 'A', description: 'About A' },
            { value: 'b', label: 'B' },
          ]}
        />
      );
      expect(
        screen.getByRole('radio', { name: 'A' }).getAttribute('aria-describedby')
      ).toBeTruthy();
      expect(screen.getByRole('radio', { name: 'B' }).getAttribute('aria-describedby')).toBeNull();
    });

    it('renders no radios and no crash for an empty options list', () => {
      render(<Harness variant="card" options={[]} />);
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
    });
  });

  describe('P2 card variant in a required form', () => {
    it('submitting empty shows the required error and does not submit', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<Harness variant="card" validation={{ required: true }} onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      expect((await screen.findByText('This field is required')).textContent).toBe(
        'This field is required'
      );
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('marks the group required and invalid, pointing at the error element', async () => {
      const user = userEvent.setup();
      render(<Harness variant="card" validation={{ required: true }} />);

      const group = screen.getByRole('radiogroup');
      expect(group.getAttribute('aria-required')).toBe('true');
      expect(group.getAttribute('aria-invalid')).toBe('false');

      await user.click(screen.getByRole('button', { name: 'Submit' }));
      await screen.findByText('This field is required');

      expect(group.getAttribute('aria-invalid')).toBe('true');
      const errorId = group.getAttribute('aria-errormessage') as string;
      expect(document.getElementById(errorId)?.textContent).toBe('This field is required');
    });

    it('picking a card then submitting passes the chosen value and clears the error', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<Harness variant="card" validation={{ required: true }} onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));
      await screen.findByText('This field is required');

      await user.click(screen.getByRole('radio', { name: 'Team' }));
      expect(checkedValues()).toEqual(['team']);
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]?.[0]).toEqual({ plan: 'team' });
      expect(screen.queryByText('This field is required')).toBeNull();
    });

    it('clicking the description text selects the option', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<Harness variant="card" onSubmit={onSubmit} />);

      await user.click(screen.getByText('Shared access for small teams'));
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]?.[0]).toEqual({ plan: 'team' });
    });

    it('a non-required card field submits empty without error', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<Harness variant="card" onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]?.[0]).toEqual({ plan: '' });
    });

    it('surfaces the validateRadio message for a rejected value', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(
        <Harness
          variant="card"
          onSubmit={onSubmit}
          validateRadio={(v) => (v === 'team' ? 'Team is full' : true)}
        />
      );

      await user.click(screen.getByRole('radio', { name: 'Team' }));
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      expect(await screen.findByText('Team is full')).toBeTruthy();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not select or submit a disabled option', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<Harness variant="card" validation={{ required: true }} onSubmit={onSubmit} />);

      const enterprise = screen.getByRole('radio', { name: 'Enterprise' });
      expect(enterprise.hasAttribute('disabled')).toBe(true);
      await user.click(enterprise);
      expect(checkedValues()).toEqual([]);

      await user.click(screen.getByRole('button', { name: 'Submit' }));
      await screen.findByText('This field is required');
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('P3 card and default variants agree', () => {
    for (const variant of ['default', 'card'] as const) {
      it(`${variant}: empty submit errors, then the chosen value is submitted`, async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(<Harness variant={variant} validation={{ required: true }} onSubmit={onSubmit} />);

        await user.click(screen.getByRole('button', { name: 'Submit' }));
        expect(await screen.findByText('This field is required')).toBeTruthy();
        expect(onSubmit).not.toHaveBeenCalled();

        await user.click(screen.getByRole('radio', { name: /^Starter/ }));
        await user.click(screen.getByRole('button', { name: 'Submit' }));

        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        expect(onSubmit.mock.calls[0]?.[0]).toEqual({ plan: 'starter' });
      });

      it(`${variant}: validateRadio rejection blocks submit`, async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(<Harness variant={variant} onSubmit={onSubmit} validateRadio={() => 'Nope'} />);

        await user.click(screen.getByRole('radio', { name: /^Starter/ }));
        await user.click(screen.getByRole('button', { name: 'Submit' }));

        expect(await screen.findByText('Nope')).toBeTruthy();
        expect(onSubmit).not.toHaveBeenCalled();
      });
    }

    it('omitting variant is the default variant (native radio inputs)', () => {
      render(<Harness />);
      expect(
        screen
          .getAllByRole('radio')
          .every((r) => r.tagName === 'INPUT' && r.getAttribute('type') === 'radio')
      ).toBe(true);
    });

    it('the card variant renders button radios, not native inputs', () => {
      render(<Harness variant="card" />);
      expect(screen.getAllByRole('radio').every((r) => r.tagName === 'BUTTON')).toBe(true);
    });
  });

  describe('P4 options without descriptions render as before', () => {
    it('default variant: no description nodes are rendered', () => {
      const { container } = render(<Harness options={plain} />);
      expect(container.querySelector('[id$="-description"]')).toBeNull();
    });

    it('default variant: radios have no aria-describedby when there is no error', () => {
      render(<Harness options={plain} />);
      for (const r of screen.getAllByRole('radio')) {
        expect(r.getAttribute('aria-describedby')).toBeNull();
      }
    });

    it('default variant: aria-describedby is only the error id after a failed submit', async () => {
      const user = userEvent.setup();
      render(<Harness options={plain} validation={{ required: true }} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));
      await screen.findByText('This field is required');

      for (const r of screen.getAllByRole('radio')) {
        expect(r.getAttribute('aria-describedby')).toBe('plan-error');
      }
    });

    it('card variant: undescribed cards have no description element', () => {
      const { container } = render(<Harness variant="card" options={plain} />);
      expect(screen.getAllByRole('radio')).toHaveLength(2);
      expect(screen.getAllByRole('radio').every((r) => !r.hasAttribute('aria-describedby'))).toBe(
        true
      );
      expect(container.textContent).not.toContain('undefined');
    });

    it('default variant: label and option labels render, helper text unchanged', () => {
      render(<Harness options={plain} helperText="Pick one plan" />);
      expect(screen.getByText('Pick one plan')).toBeTruthy();
      expect(screen.getByRole('radio', { name: 'Starter' })).toBeTruthy();
      expect(screen.getByRole('radio', { name: 'Team' })).toBeTruthy();
    });
  });

  describe('P5 default variant with descriptions', () => {
    it('shows each description and links it to its radio', () => {
      render(<Harness />);
      const starter = screen.getByRole('radio', { name: /Starter/ });
      const id = starter.getAttribute('aria-describedby') as string;
      expect(document.getElementById(id)?.textContent).toBe('For trying things out');
    });

    it('keeps the description in the label text (clicking it selects the option)', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<Harness onSubmit={onSubmit} />);

      await user.click(screen.getByText('Shared access for small teams'));
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]?.[0]).toEqual({ plan: 'team' });
    });

    it('lists both the error and the description ids when both apply', async () => {
      const user = userEvent.setup();
      render(<Harness validation={{ required: true }} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));
      await screen.findByText('This field is required');

      const ids = (
        screen.getByRole('radio', { name: /Starter/ }).getAttribute('aria-describedby') as string
      ).split(' ');
      expect(ids).toContain('plan-error');
      expect(ids).toHaveLength(2);
    });

    it('a disabled described option is reported disabled and does not change the value', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const enterprise = screen.getByRole('radio', { name: /Enterprise/ });
      expect(enterprise.hasAttribute('disabled')).toBe(true);
      await user.click(enterprise);
      expect(checkedValues()).toEqual([]);
    });
  });
});
