/**
 * 005 SF-11 · INV-9: handler widening is source-compatible and the event is typed to the button.
 *
 * The real assertions are compile-time. The package `tsconfig.json` excludes `*.test.tsx`, so this
 * file is type-checked by `pnpm typecheck:wizard-tests` (`tsconfig.wizard-tests.json`), following
 * the data-table precedent. The runtime `it` blocks only keep vitest from reporting an empty file
 * and pin the export surface.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ComponentProps, MouseEvent } from 'react';

import * as kit from '../../../../index';
import * as wizard from '../index';
import type { WizardLayoutProps } from '../WizardLayout';
import { WizardNavigation, type WizardNavigationProps } from '../WizardNavigation';

type Handler = WizardNavigationProps['onNext'];

// ---- Zero-argument handlers still compile (scenario 2) -------------------------------------

const zeroArg: WizardNavigationProps = {
  isFirstStep: false,
  isLastStep: false,
  onPrevious: () => undefined,
  onNext: () => undefined,
  onCancel: () => undefined,
  onLastStepSecondary: () => undefined,
};

const asyncZeroArg: WizardNavigationProps = {
  isFirstStep: false,
  isLastStep: false,
  onPrevious: async () => undefined,
  onNext: async () => {
    await Promise.resolve();
  },
};

// A pre-SF-11 caller with a `() => void` variable typed separately.
const legacyHandler: () => void = () => undefined;
const legacy: WizardNavigationProps = {
  isFirstStep: true,
  isLastStep: false,
  onPrevious: legacyHandler,
  onNext: legacyHandler,
};

// ---- Event handlers get the button ---------------------------------------------------------

const withEvent: WizardNavigationProps = {
  isFirstStep: false,
  isLastStep: true,
  onPrevious: (event) => {
    expectTypeOf(event).toEqualTypeOf<MouseEvent<HTMLButtonElement>>();
  },
  onNext: async (event) => {
    const trigger = event.currentTarget;
    expectTypeOf(trigger).toEqualTypeOf<EventTarget & HTMLButtonElement>();
    await Promise.resolve();
    trigger.focus(); // no cast needed
  },
  onCancel: (event) => event.currentTarget.focus(),
  onLastStepSecondary: (event) => event.currentTarget.blur(),
};

expectTypeOf<Handler>().parameters.toEqualTypeOf<[event: MouseEvent<HTMLButtonElement>]>();
expectTypeOf<Handler>().returns.toEqualTypeOf<void>();
expectTypeOf<NonNullable<WizardNavigationProps['onCancel']>>().toEqualTypeOf<Handler>();
expectTypeOf<NonNullable<WizardNavigationProps['onLastStepSecondary']>>().toEqualTypeOf<Handler>();
expectTypeOf<WizardNavigationProps['onPrevious']>().toEqualTypeOf<Handler>();

// ---- Negative cases --------------------------------------------------------------------------

const divHandler = (_event: MouseEvent<HTMLDivElement>): void => undefined;
const negativeDiv: WizardNavigationProps = {
  isFirstStep: false,
  isLastStep: false,
  onPrevious: () => undefined,
  // @ts-expect-error a handler typed to a non-button element's event is rejected
  onNext: (event: MouseEvent<HTMLDivElement>) => divHandler(event),
};

const negativeTwoArgs: WizardNavigationProps = {
  isFirstStep: false,
  isLastStep: false,
  onPrevious: () => undefined,
  // @ts-expect-error a handler requiring a second argument is rejected (the kit passes one)
  onNext: (_event: MouseEvent<HTMLButtonElement>, _extra: number) => undefined,
};

// ---- New props are optional with the documented types ---------------------------------------

expectTypeOf<WizardNavigationProps['previousLabel']>().toEqualTypeOf<string | undefined>();
expectTypeOf<WizardNavigationProps['previousDisabled']>().toEqualTypeOf<boolean | undefined>();
expectTypeOf<WizardNavigationProps['primaryLoading']>().toEqualTypeOf<boolean | undefined>();
expectTypeOf<WizardNavigationProps['primaryIcon']>().toEqualTypeOf<
  ComponentProps<typeof WizardNavigation>['primaryIcon']
>();

// ---- WizardLayout handler types are unchanged -------------------------------------------------

expectTypeOf<WizardLayoutProps['onStepChange']>().toEqualTypeOf<(index: number) => void>();
expectTypeOf<WizardLayoutProps['onComplete']>().toEqualTypeOf<(() => void) | undefined>();
expectTypeOf<WizardLayoutProps['onLastStepPrimary']>().toEqualTypeOf<(() => void) | undefined>();
expectTypeOf<WizardLayoutProps['onCancel']>().toEqualTypeOf<(() => void) | undefined>();
expectTypeOf<WizardLayoutProps['onLastStepSecondary']>().toEqualTypeOf<(() => void) | undefined>();
expectTypeOf<WizardLayoutProps['previousLabel']>().toEqualTypeOf<
  WizardNavigationProps['previousLabel']
>();
expectTypeOf<WizardLayoutProps['previousDisabled']>().toEqualTypeOf<
  WizardNavigationProps['previousDisabled']
>();
expectTypeOf<WizardLayoutProps['primaryLoading']>().toEqualTypeOf<
  WizardNavigationProps['primaryLoading']
>();
expectTypeOf<WizardLayoutProps['primaryIcon']>().toEqualTypeOf<
  WizardNavigationProps['primaryIcon']
>();

describe('INV-9: handler widening is source-compatible (compile-time; see typecheck:wizard-tests)', () => {
  it('fixtures are well-formed objects (the real check is the typecheck)', () => {
    for (const p of [zeroArg, asyncZeroArg, legacy, withEvent, negativeDiv, negativeTwoArgs]) {
      expect(typeof p.onNext).toBe('function');
    }
  });

  it('no new runtime exports: the wizard barrel exports exactly the pre-SF-11 names', () => {
    expect(Object.keys(wizard).sort()).toEqual([
      'WizardLayout',
      'WizardNavigation',
      'WizardStepper',
    ]);
    expect(kit.WizardNavigation).toBe(WizardNavigation);
    expect(Object.keys(kit)).not.toContain('NavigationClickHandler');
  });
});
