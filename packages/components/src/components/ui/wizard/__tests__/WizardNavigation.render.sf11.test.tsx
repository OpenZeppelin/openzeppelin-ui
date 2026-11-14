/**
 * 005 SF-11 · Configurable WizardNavigation — render and prop contract (jsdom).
 *
 * `INV-N` is SF-11's series (`artifacts/005-uikit-requests/sf-11-…/03-invariants.md`).
 * INV-5 is tested as amended in Code Draft: the blocked look is `opacity-50` only, and
 * `pointer-events-none` must be absent (a click must land on the button, not fall through).
 * Focus, real CSS and axe live in `WizardNavigation.sf11.browser.test.tsx`.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import React from 'react';

import { Spinner } from '../../spinner';
import { WizardLayout, type WizardStepConfig } from '../WizardLayout';
import { WizardNavigation, type WizardNavigationProps } from '../WizardNavigation';
import { BaselineWizardNavigation } from './WizardNavigation.sf11-baseline';

const noop = (): void => undefined;
const BOOLS = [false, true] as const;

function base(overrides: Partial<WizardNavigationProps> = {}): WizardNavigationProps {
  return { isFirstStep: false, isLastStep: false, onPrevious: noop, onNext: noop, ...overrides };
}

function nav(container: HTMLElement): HTMLElement {
  const root = container.firstElementChild;
  if (!(root instanceof HTMLElement)) throw new Error('WizardNavigation root missing');
  return root;
}

function primaryOf(container: HTMLElement): HTMLButtonElement {
  const groups = nav(container).children;
  const right = groups[1];
  const buttons = right?.querySelectorAll('button');
  const last = buttons?.[buttons.length - 1];
  if (!(last instanceof HTMLButtonElement)) throw new Error('primary missing');
  return last;
}

function classTokens(el: Element): string[] {
  return (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
}

const SPINNER_SELECTOR = 'svg.animate-spin';

// ---------------------------------------------------------------------------
// INV-1: default render is byte-identical to the pre-SF-11 component
// ---------------------------------------------------------------------------

describe('INV-1: default render is byte-identical to the pre-SF-11 baseline', () => {
  it('matches the baseline in all 64 cells of the existing-prop matrix (props omitted and explicit defaults)', () => {
    let cells = 0;
    for (const isFirstStep of BOOLS)
      for (const isLastStep of BOOLS)
        for (const canProceed of BOOLS)
          for (const withCancel of BOOLS)
            for (const withSecondary of BOOLS)
              for (const showLastStepPrimary of BOOLS) {
                const props = {
                  isFirstStep,
                  isLastStep,
                  canProceed,
                  showLastStepPrimary,
                  onPrevious: noop,
                  onNext: noop,
                  onCancel: withCancel ? noop : undefined,
                  lastStepSecondaryLabel: withSecondary ? 'Preview' : undefined,
                  onLastStepSecondary: withSecondary ? noop : undefined,
                };
                const expected = render(<BaselineWizardNavigation {...props} />).container
                  .innerHTML;
                const omitted = render(<WizardNavigation {...props} />).container.innerHTML;
                const explicit = render(
                  <WizardNavigation
                    {...props}
                    previousLabel={undefined}
                    previousDisabled={false}
                    primaryLoading={false}
                    primaryIcon={undefined}
                  />
                ).container.innerHTML;
                expect(omitted, `cell ${JSON.stringify(props)}`).toBe(expected);
                expect(explicit, `cell (explicit defaults) ${JSON.stringify(props)}`).toBe(
                  expected
                );
                cells += 1;
              }
    expect(cells).toBe(64);
  });

  it('matches the baseline with the remaining existing props set (labels, extra actions, className, secondary disabled)', () => {
    const variants: Array<Partial<WizardNavigationProps>> = [
      { nextLabel: 'Continue' },
      { nextLabel: '' },
      { isLastStep: true, lastStepLabel: 'Deploy' },
      { extraActions: <button type="button">Show code</button> },
      { className: 'mt-4 custom' },
      {
        isLastStep: true,
        lastStepSecondaryLabel: 'Preview',
        onLastStepSecondary: noop,
        lastStepSecondaryDisabled: true,
      },
      { isLastStep: true, lastStepSecondaryLabel: '', onLastStepSecondary: noop },
    ];
    for (const v of variants) {
      const props = base(v);
      // The baseline's handlers are `() => void`; handler identity never reaches the markup.
      const legacy = {
        ...props,
        onPrevious: noop,
        onNext: noop,
        onCancel: props.onCancel && noop,
        onLastStepSecondary: props.onLastStepSecondary && noop,
      };
      const expected = render(<BaselineWizardNavigation {...legacy} />).container.innerHTML;
      expect(render(<WizardNavigation {...props} />).container.innerHTML).toBe(expected);
    }
  });

  it('carries no aria-disabled, aria-busy or spinner anywhere in a default render (failure guard for SC-002)', () => {
    const { container } = render(
      <WizardNavigation {...base({ onCancel: noop })} canProceed={false} />
    );
    expect(container.querySelector('[aria-disabled]')).toBeNull();
    expect(container.querySelector('[aria-busy]')).toBeNull();
    expect(container.querySelector(SPINNER_SELECTOR)).toBeNull();
  });

  it('WizardLayout paged nav bar without the new props equals the baseline nav for first, middle and last step', () => {
    const steps: WizardStepConfig[] = [
      { id: 'a', title: 'A', component: <p>A</p> },
      { id: 'b', title: 'B', component: <p>B</p>, isValid: false },
      { id: 'c', title: 'C', component: <p>C</p> },
    ];
    for (const variant of ['horizontal', 'vertical'] as const) {
      for (const [index, expectedProps] of [
        [0, { isFirstStep: true, isLastStep: false, canProceed: true }],
        [1, { isFirstStep: false, isLastStep: false, canProceed: false }],
        [2, { isFirstStep: false, isLastStep: true, canProceed: true }],
      ] as const) {
        const { container, unmount } = render(
          <WizardLayout
            variant={variant}
            steps={steps}
            currentStepIndex={index}
            onStepChange={noop}
            onCancel={noop}
            lastStepSecondaryLabel="Preview"
            onLastStepSecondary={noop}
          />
        );
        const navHost = container.querySelector('.border-t .max-w-5xl');
        const expected = render(
          <BaselineWizardNavigation
            {...expectedProps}
            onPrevious={noop}
            onNext={noop}
            onCancel={noop}
            lastStepSecondaryLabel="Preview"
            onLastStepSecondary={noop}
          />
        ).container.innerHTML;
        expect(navHost?.innerHTML, `${variant} step ${index}`).toBe(expected);
        unmount();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// INV-2: Back label rendered exactly as given
// ---------------------------------------------------------------------------

describe('INV-2: Back label is rendered verbatim', () => {
  it('happy path: previousLabel="Back" renders "Back" with ChevronLeft before it', () => {
    render(<WizardNavigation {...base({ previousLabel: 'Back' })} />);
    const back = screen.getByRole('button', { name: 'Back' });
    expect(back.firstElementChild?.tagName.toLowerCase()).toBe('svg');
    expect(back.firstElementChild?.getAttribute('class')).toContain('lucide-chevron-left');
    expect(back.textContent).toBe('Back');
  });

  it('default: undefined renders "Previous"', () => {
    render(<WizardNavigation {...base()} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeTruthy();
  });

  it('boundary: "" renders an icon-only Back, still named "Previous"', () => {
    const { container } = render(<WizardNavigation {...base({ previousLabel: '' })} />);
    const back = nav(container).children[0]?.querySelector('button');
    // No visible text fallback, but the button is not left unnamed.
    expect(back?.textContent).toBe('');
    expect(back?.querySelectorAll('svg.lucide-chevron-left').length).toBe(1);
    expect(screen.getByRole('button', { name: 'Previous' })).toBe(back);
  });

  it('boundary: a whitespace-only label is also named "Previous"', () => {
    render(<WizardNavigation {...base({ previousLabel: '   ' })} />);
    expect(screen.getByRole('button', { name: 'Previous' }).textContent).toBe('   ');
  });

  it('a visible label gets no aria-label', () => {
    render(<WizardNavigation {...base({ previousLabel: 'Back' })} />);
    expect(screen.getByRole('button', { name: 'Back' }).hasAttribute('aria-label')).toBe(false);
  });

  it('boundary: whitespace and markup-like labels are not trimmed or interpreted', () => {
    render(<WizardNavigation {...base({ previousLabel: '  <b>Back</b> ' })} />);
    const back = screen.getAllByRole('button')[0];
    expect(back?.textContent).toBe('  <b>Back</b> ');
    expect(back?.querySelector('b')).toBeNull();
  });

  it('failure guard: on the first step Back is absent whatever previousLabel / previousDisabled say', () => {
    const { container } = render(
      <WizardNavigation
        {...base({ isFirstStep: true, previousLabel: 'Back', previousDisabled: true })}
      />
    );
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    expect(within(nav(container)).getAllByRole('button')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// INV-3: primary icon resolution is total and single
// ---------------------------------------------------------------------------

describe('INV-3: primary icon resolution', () => {
  const custom = <svg data-testid="custom-icon" />;
  const cases: Array<{
    label: string;
    icon: React.ReactNode;
    nonLast: 'chevron' | 'none' | 'custom';
    last: 'chevron' | 'none' | 'custom';
  }> = [
    { label: 'undefined', icon: undefined, nonLast: 'chevron', last: 'none' },
    { label: 'null', icon: null, nonLast: 'none', last: 'none' },
    { label: 'false', icon: false, nonLast: 'none', last: 'none' },
    { label: 'custom svg', icon: custom, nonLast: 'custom', last: 'custom' },
  ];

  for (const c of cases) {
    for (const isLastStep of BOOLS) {
      const want = isLastStep ? c.last : c.nonLast;
      it(`primaryIcon=${c.label}, ${isLastStep ? 'last' : 'non-last'} step → ${want}`, () => {
        const props = base({ isLastStep });
        const { container } = render(
          c.icon === undefined ? (
            <WizardNavigation {...props} />
          ) : (
            <WizardNavigation {...props} primaryIcon={c.icon} />
          )
        );
        const primary = primaryOf(container);
        const svgs = primary.querySelectorAll('svg');
        const nodes = Array.from(primary.childNodes);
        const textIndex = nodes.findIndex((n) => n.nodeType === Node.TEXT_NODE);
        expect(primary.textContent).toBe(isLastStep ? 'Finish' : 'Next');
        if (want === 'none') {
          expect(svgs).toHaveLength(0);
          return;
        }
        expect(svgs, 'never two trailing icons').toHaveLength(1);
        const iconIndex = nodes.indexOf(svgs[0] as ChildNode);
        expect(iconIndex, 'label comes before the icon').toBeGreaterThan(textIndex);
        if (want === 'chevron') expect(svgs[0]?.getAttribute('class')).toContain('chevron-right');
        else expect(svgs[0]?.getAttribute('data-testid')).toBe('custom-icon');
      });
    }
  }

  it('Back keeps ChevronLeft whatever primaryIcon is', () => {
    render(<WizardNavigation {...base({ primaryIcon: null })} />);
    const back = screen.getByRole('button', { name: 'Previous' });
    expect(back.querySelectorAll('svg.lucide-chevron-left')).toHaveLength(1);
  });

  it('boundary: 0 and "" are ReactNodes and render as given (React semantics, not a fallback)', () => {
    const { container, rerender } = render(<WizardNavigation {...base({ primaryIcon: 0 })} />);
    expect(primaryOf(container).textContent).toBe('Next0');
    expect(primaryOf(container).querySelector('svg')).toBeNull();
    rerender(<WizardNavigation {...base({ primaryIcon: '' })} />);
    expect(primaryOf(container).textContent).toBe('Next');
    expect(primaryOf(container).querySelector('svg')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// INV-4: pending shows exactly one decorative SF-9 spinner
// ---------------------------------------------------------------------------

describe('INV-4: pending render shows one decorative kit Spinner', () => {
  it('pending: one spinner, first child, aria-hidden, no role=status, no margin class', () => {
    const { container } = render(<WizardNavigation {...base({ primaryLoading: true })} />);
    const primary = primaryOf(container);
    const spinners = primary.querySelectorAll(SPINNER_SELECTOR);
    expect(spinners).toHaveLength(1);
    expect(primary.firstChild).toBe(spinners[0]);
    expect(spinners[0]?.getAttribute('aria-hidden')).toBe('true');
    expect(spinners[0]?.getAttribute('role')).toBeNull();
    expect(within(primary).queryByRole('status')).toBeNull();
    expect(classTokens(spinners[0] as Element).filter((t) => /^-?m[trblxy]?-/.test(t))).toEqual([]);
  });

  it('is the SF-9 Spinner (same markup as <Spinner />), not a copy', () => {
    const { container } = render(<WizardNavigation {...base({ primaryLoading: true })} />);
    const kit = render(<Spinner />).container.innerHTML;
    expect(primaryOf(container).querySelector(SPINNER_SELECTOR)?.outerHTML).toBe(kit);
  });

  it('label and trailing icon are unchanged by pending (spinner removed → idle children)', () => {
    for (const isLastStep of BOOLS) {
      const idle = primaryOf(render(<WizardNavigation {...base({ isLastStep })} />).container);
      const pending = primaryOf(
        render(<WizardNavigation {...base({ isLastStep, primaryLoading: true })} />).container
      );
      pending.querySelector(SPINNER_SELECTOR)?.remove();
      expect(pending.innerHTML).toBe(idle.innerHTML);
    }
  });

  it('idle: no spinner anywhere', () => {
    const { container } = render(<WizardNavigation {...base({ onCancel: noop })} />);
    expect(container.querySelector(SPINNER_SELECTOR)).toBeNull();
  });

  it('boundary: last step with showLastStepPrimary=false + primaryLoading renders without error and with no spinner', () => {
    const { container } = render(
      <WizardNavigation
        {...base({ isLastStep: true, showLastStepPrimary: false, primaryLoading: true })}
      />
    );
    expect(container.querySelector(SPINNER_SELECTOR)).toBeNull();
    expect(container.querySelector('[aria-busy]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Finish' })).toBeNull();
  });

  it('Back, Cancel, secondary and extra actions never get a spinner', () => {
    const { container } = render(
      <WizardNavigation
        {...base({
          isLastStep: true,
          primaryLoading: true,
          previousDisabled: true,
          onCancel: noop,
          lastStepSecondaryLabel: 'Preview',
          onLastStepSecondary: noop,
          extraActions: <button type="button">Show code</button>,
        })}
      />
    );
    const spinners = container.querySelectorAll(SPINNER_SELECTOR);
    expect(spinners).toHaveLength(1);
    expect(spinners[0]?.closest('button')).toBe(primaryOf(container));
  });
});

// ---------------------------------------------------------------------------
// INV-5 (amended): blocked look is opacity-50 only, never pointer-events-none
// ---------------------------------------------------------------------------

describe('INV-5 (amended): the blocked look is opacity-50 only', () => {
  it('opacity-50 is present on Back iff previousDisabled, on the primary iff primaryLoading', () => {
    for (const previousDisabled of BOOLS)
      for (const primaryLoading of BOOLS) {
        const { container, unmount } = render(
          <WizardNavigation {...base({ previousDisabled, primaryLoading })} />
        );
        const back = screen.getByRole('button', { name: 'Previous' });
        expect(classTokens(back).includes('opacity-50')).toBe(previousDisabled);
        expect(classTokens(primaryOf(container)).includes('opacity-50')).toBe(primaryLoading);
        unmount();
      }
  });

  it('the blocked class string is exactly the idle string plus opacity-50 (no other token added)', () => {
    const idle = render(<WizardNavigation {...base()} />).container;
    const idleBack = classTokens(idle.querySelectorAll('button')[0] as Element);
    const idlePrimary = classTokens(primaryOf(idle));
    const blocked = render(
      <WizardNavigation {...base({ previousDisabled: true, primaryLoading: true })} />
    ).container;
    const blockedBack = classTokens(blocked.querySelectorAll('button')[0] as Element);
    const blockedPrimary = classTokens(primaryOf(blocked));
    expect(blockedBack.filter((t) => !idleBack.includes(t))).toEqual(['opacity-50']);
    expect(blockedPrimary.filter((t) => !idlePrimary.includes(t))).toEqual(['opacity-50']);
    expect(idleBack.filter((t) => !blockedBack.includes(t))).toEqual([]);
  });

  it('failure guard: no unconditional pointer-events-none token on Back or the primary in any state', () => {
    for (const previousDisabled of BOOLS)
      for (const primaryLoading of BOOLS) {
        const { container, unmount } = render(
          <WizardNavigation {...base({ previousDisabled, primaryLoading })} />
        );
        for (const b of [container.querySelectorAll('button')[0], primaryOf(container)]) {
          const tokens = classTokens(b as Element);
          expect(tokens).not.toContain('pointer-events-none');
          expect(tokens).not.toContain('aria-disabled:pointer-events-none');
          expect(tokens).not.toContain('aria-busy:pointer-events-none');
        }
        unmount();
      }
  });
});

// ---------------------------------------------------------------------------
// INV-6: ARIA attributes present iff their prop is set
// ---------------------------------------------------------------------------

describe('INV-6: aria-disabled / aria-busy present iff their prop is set', () => {
  const values = [undefined, false, true] as const;
  for (const isLastStep of BOOLS)
    for (const previousDisabled of values)
      for (const primaryLoading of values) {
        it(`${isLastStep ? 'last' : 'middle'} step, previousDisabled=${String(previousDisabled)}, primaryLoading=${String(primaryLoading)}`, () => {
          const props: WizardNavigationProps = base({
            isLastStep,
            onCancel: noop,
            lastStepSecondaryLabel: 'Preview',
            onLastStepSecondary: noop,
            extraActions: <button type="button">Show code</button>,
          });
          if (previousDisabled !== undefined) props.previousDisabled = previousDisabled;
          if (primaryLoading !== undefined) props.primaryLoading = primaryLoading;
          const { container } = render(<WizardNavigation {...props} />);
          const back = screen.getByRole('button', { name: 'Previous' });
          const primary = primaryOf(container);
          if (previousDisabled === true) expect(back.getAttribute('aria-disabled')).toBe('true');
          else expect(back.hasAttribute('aria-disabled')).toBe(false);
          expect(back.hasAttribute('aria-busy')).toBe(false);
          if (primaryLoading === true) {
            expect(primary.getAttribute('aria-disabled')).toBe('true');
            expect(primary.getAttribute('aria-busy')).toBe('true');
          } else {
            expect(primary.hasAttribute('aria-disabled')).toBe(false);
            expect(primary.hasAttribute('aria-busy')).toBe(false);
          }
          const others = [
            screen.getByRole('button', { name: 'Cancel' }),
            screen.getByRole('button', { name: 'Show code' }),
            ...(isLastStep ? [screen.getByRole('button', { name: 'Preview' })] : []),
          ];
          for (const o of others) {
            expect(o.hasAttribute('aria-disabled')).toBe(false);
            expect(o.hasAttribute('aria-busy')).toBe(false);
          }
        });
      }
});

// ---------------------------------------------------------------------------
// INV-7: pending and Back-disabled are orthogonal (render side; activation in interaction suite)
// ---------------------------------------------------------------------------

describe('INV-7: primaryLoading and previousDisabled change only their own button', () => {
  for (const previousDisabled of BOOLS)
    for (const primaryLoading of BOOLS) {
      it(`previousDisabled=${previousDisabled}, primaryLoading=${primaryLoading}`, () => {
        const { container } = render(
          <WizardNavigation {...base({ previousDisabled, primaryLoading, onCancel: noop })} />
        );
        const back = screen.getByRole('button', { name: 'Previous' });
        const primary = primaryOf(container);
        expect(back.hasAttribute('aria-disabled')).toBe(previousDisabled);
        expect(back.querySelector(SPINNER_SELECTOR)).toBeNull();
        expect(primary.hasAttribute('aria-disabled')).toBe(primaryLoading);
        expect(primary.hasAttribute('aria-busy')).toBe(primaryLoading);
        const cancel = screen.getByRole('button', { name: 'Cancel' });
        const idleCancel = render(
          <WizardNavigation {...base({ onCancel: noop })} />
        ).container.querySelector('button')?.outerHTML;
        expect(cancel.outerHTML).toBe(idleCancel);
      });
    }
});

// ---------------------------------------------------------------------------
// INV-8: native disabled scope is unchanged
// ---------------------------------------------------------------------------

describe('INV-8: native disabled scope', () => {
  for (const canProceed of BOOLS)
    for (const primaryLoading of BOOLS)
      for (const previousDisabled of BOOLS) {
        it(`canProceed=${canProceed}, primaryLoading=${primaryLoading}, previousDisabled=${previousDisabled}`, () => {
          const { container } = render(
            <WizardNavigation
              {...base({ canProceed, primaryLoading, previousDisabled, onCancel: noop })}
            />
          );
          expect(primaryOf(container).disabled).toBe(!canProceed);
          expect(
            (screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled
          ).toBe(false);
          expect(
            (screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled
          ).toBe(false);
        });
      }

  it('secondary is natively disabled iff lastStepSecondaryDisabled, regardless of the new props', () => {
    for (const lastStepSecondaryDisabled of [undefined, false, true] as const) {
      const { unmount } = render(
        <WizardNavigation
          {...base({
            isLastStep: true,
            lastStepSecondaryLabel: 'Preview',
            onLastStepSecondary: noop,
            lastStepSecondaryDisabled,
            primaryLoading: true,
            previousDisabled: true,
          })}
        />
      );
      expect((screen.getByRole('button', { name: 'Preview' }) as HTMLButtonElement).disabled).toBe(
        lastStepSecondaryDisabled === true
      );
      unmount();
    }
  });

  it('boundary: pending + !canProceed keeps native disabled AND aria-disabled, aria-busy and the spinner', () => {
    const { container } = render(
      <WizardNavigation {...base({ canProceed: false, primaryLoading: true })} />
    );
    const primary = primaryOf(container);
    expect(primary.disabled).toBe(true);
    expect(primary.getAttribute('aria-disabled')).toBe('true');
    expect(primary.getAttribute('aria-busy')).toBe('true');
    expect(primary.querySelectorAll(SPINNER_SELECTOR)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// INV-15 (attribute part): every nav button is type="button" in every state
// ---------------------------------------------------------------------------

describe('INV-15: every nav button is type="button"', () => {
  it('in every state combination, including last step with secondary', () => {
    for (const isLastStep of BOOLS)
      for (const previousDisabled of BOOLS)
        for (const primaryLoading of BOOLS)
          for (const canProceed of BOOLS) {
            const { container, unmount } = render(
              <WizardNavigation
                {...base({
                  isLastStep,
                  previousDisabled,
                  primaryLoading,
                  canProceed,
                  onCancel: noop,
                  lastStepSecondaryLabel: 'Preview',
                  onLastStepSecondary: noop,
                })}
              />
            );
            const buttons = container.querySelectorAll('button');
            expect(buttons.length).toBe(isLastStep ? 4 : 3);
            for (const b of buttons) expect(b.getAttribute('type')).toBe('button');
            unmount();
          }
  });
});

// ---------------------------------------------------------------------------
// INV-16: WizardLayout forwards the four props to paged variants only (conditional, decision 8)
// ---------------------------------------------------------------------------

describe('INV-16 (conditional on decision 8): WizardLayout forwarding', () => {
  const steps: WizardStepConfig[] = [
    { id: 'a', title: 'Alpha', component: <p>A</p> },
    { id: 'b', title: 'Beta', component: <p>B</p> },
    { id: 'c', title: 'Gamma', component: <p>C</p> },
  ];
  const icon = <svg data-testid="fwd-icon" />;

  for (const variant of ['horizontal', 'vertical'] as const) {
    for (const index of [1, 2]) {
      it(`${variant}, step ${index}: nav bar equals a direct WizardNavigation render with the same values`, () => {
        const { container } = render(
          <WizardLayout
            variant={variant}
            steps={steps}
            currentStepIndex={index}
            onStepChange={noop}
            onCancel={noop}
            previousLabel="Back"
            previousDisabled
            primaryLoading
            primaryIcon={icon}
          />
        );
        const navHost = container.querySelector('.border-t .max-w-5xl');
        const direct = render(
          <WizardNavigation
            isFirstStep={false}
            isLastStep={index === 2}
            onPrevious={noop}
            onNext={noop}
            onCancel={noop}
            previousLabel="Back"
            previousDisabled
            primaryLoading
            primaryIcon={icon}
          />
        ).container.innerHTML;
        expect(navHost?.innerHTML).toBe(direct);
      });
    }
  }

  it('scrollable: the four props are ignored (footer identical, no busy/disabled/spinner/Back)', () => {
    const common = {
      variant: 'scrollable' as const,
      steps,
      currentStepIndex: 0,
      onStepChange: noop,
      onComplete: noop,
      scrollableSecondaryLabel: 'Save draft',
      onScrollableSecondary: noop,
    };
    const plain = render(<WizardLayout {...common} />);
    const plainFooter = plain.container.querySelector('.pt-8')?.innerHTML;
    plain.unmount();
    const { container } = render(
      <WizardLayout
        {...common}
        previousLabel="Back"
        previousDisabled
        primaryLoading
        primaryIcon={icon}
      />
    );
    expect(container.querySelector('.pt-8')?.innerHTML).toBe(plainFooter);
    expect(container.querySelector('[aria-busy]')).toBeNull();
    expect(container.querySelector('[aria-disabled]')).toBeNull();
    expect(container.querySelector(SPINNER_SELECTOR)).toBeNull();
    expect(screen.queryByTestId('fwd-icon')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('stepper is unaffected: getStepLabel still forwarded with the new props set', () => {
    render(
      <WizardLayout
        variant="horizontal"
        steps={steps}
        currentStepIndex={1}
        onStepChange={noop}
        primaryLoading
        previousDisabled
        getStepLabel={({ title, state }) => `${title} is ${state}`}
      />
    );
    const stepsNav = screen.getByRole('navigation', { name: 'Wizard steps' });
    expect(within(stepsNav).getByRole('button', { name: 'Beta is current' })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// INV-19: settle restores idle exactly
// ---------------------------------------------------------------------------

describe('INV-19: leaving pending / Back-disabled restores the idle DOM exactly', () => {
  it('idle → pending → idle equals a fresh never-pending render (primary)', () => {
    const fresh = render(<WizardNavigation {...base({ onCancel: noop })} />).container.innerHTML;
    const { container, rerender } = render(<WizardNavigation {...base({ onCancel: noop })} />);
    rerender(<WizardNavigation {...base({ onCancel: noop, primaryLoading: true })} />);
    expect(container.innerHTML).not.toBe(fresh);
    rerender(<WizardNavigation {...base({ onCancel: noop, primaryLoading: false })} />);
    expect(container.innerHTML).toBe(fresh);
  });

  it('Back: previousDisabled true → false restores the idle DOM', () => {
    const fresh = render(<WizardNavigation {...base()} />).container.innerHTML;
    const { container, rerender } = render(
      <WizardNavigation {...base({ previousDisabled: true })} />
    );
    rerender(<WizardNavigation {...base({ previousDisabled: false })} />);
    expect(container.innerHTML).toBe(fresh);
  });

  it('boundary: both on → both off (prop removed, not false) restores the idle DOM, on the last step too', () => {
    for (const isLastStep of BOOLS) {
      const fresh = render(<WizardNavigation {...base({ isLastStep })} />).container.innerHTML;
      const { container, rerender } = render(
        <WizardNavigation {...base({ isLastStep, previousDisabled: true, primaryLoading: true })} />
      );
      rerender(<WizardNavigation {...base({ isLastStep })} />);
      expect(container.innerHTML).toBe(fresh);
      expect(container.querySelector('[aria-busy="false"], [aria-disabled="false"]')).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// INV-23 (jsdom part): names stable, tab order kept, states exposed
// ---------------------------------------------------------------------------

describe('INV-23: names stay stable, buttons stay in tab order', () => {
  it('pending primary keeps its idle accessible name; disabled Back keeps its label as name', () => {
    const { rerender } = render(<WizardNavigation {...base({ previousLabel: 'Back' })} />);
    const primary = screen.getByRole('button', { name: 'Next' });
    rerender(
      <WizardNavigation
        {...base({ previousLabel: 'Back', previousDisabled: true, primaryLoading: true })}
      />
    );
    expect(screen.getByRole('button', { name: 'Next' })).toBe(primary);
    expect(screen.getByRole('button', { name: 'Back' }).getAttribute('aria-disabled')).toBe('true');
  });

  it('custom primaryIcon does not join the name; last-step pending name is the lastStepLabel', () => {
    render(
      <WizardNavigation
        {...base({ isLastStep: true, lastStepLabel: 'Save & finish', primaryLoading: true })}
        primaryIcon={<svg aria-hidden="true" />}
      />
    );
    expect(screen.getByRole('button', { name: 'Save & finish' })).toBeTruthy();
  });

  it('both blocked buttons are reachable with Tab (no tabindex=-1, inert or hidden)', async () => {
    const user = userEvent.setup();
    render(
      <WizardNavigation
        {...base({ onCancel: noop, previousDisabled: true, primaryLoading: true })}
      />
    );
    const back = screen.getByRole('button', { name: 'Previous' });
    const primary = screen.getByRole('button', { name: 'Next' });
    for (const b of [back, primary]) {
      expect(b.hasAttribute('tabindex')).toBe(false);
      expect(b.hasAttribute('inert')).toBe(false);
      expect(b.hasAttribute('hidden')).toBe(false);
    }
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
    await user.tab();
    expect(document.activeElement).toBe(back);
    await user.tab();
    expect(document.activeElement).toBe(primary);
  });
});
