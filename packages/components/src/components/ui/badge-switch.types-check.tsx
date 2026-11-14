/**
 * Type contract for Badge `disabled` / `readOnly` and Switch `readOnly`. Compile-only fixture:
 * `pnpm typecheck` (tsc --noEmit over sources) compiles it, and each `@ts-expect-error` fails
 * the build if its line ever stops being an error. Never imported at runtime; never exported
 * from the package.
 */
import type { ComponentProps } from 'react';

import { Badge, Switch, type BadgeProps } from '../../index';

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const is = <T extends true>(): T => true as T;

type SwitchProps = ComponentProps<typeof Switch>;

export const surface = [
  // All three props are optional booleans.
  is<Equals<BadgeProps['disabled'], boolean | undefined>>(),
  is<Equals<BadgeProps['readOnly'], boolean | undefined>>(),
  is<Equals<SwitchProps['readOnly'], boolean | undefined>>(),
  // Neither is required: a Badge needs only `label`, a Switch needs nothing.
  is<{ label: string } extends BadgeProps ? true : false>(),
  is<Record<never, never> extends SwitchProps ? true : false>(),
];

const noop = (): void => undefined;

export const accepted = (
  <>
    <Badge label="Open" onActivate={noop} disabled />
    <Badge label="Open" onActivate={noop} pressed disabled={false} />
    <Badge label="Open" onActivate={noop} pressed readOnly />
    <Badge label="Open" onActivate={noop} readOnly={false} />
    <Badge label="Status" disabled readOnly />
    <Switch readOnly />
    <Switch readOnly={false} checked onCheckedChange={noop} />
    <Switch readOnly disabled required name="renew" />
  </>
);

export const rejected = (
  <>
    {/* @ts-expect-error disabled takes a boolean, not a string */}
    <Badge label="Open" onActivate={noop} disabled="true" />
    {/* @ts-expect-error Badge readOnly takes a boolean, not a string */}
    <Badge label="Open" onActivate={noop} readOnly="true" />
    {/* @ts-expect-error readOnly takes a boolean, not a number */}
    <Switch readOnly={1} />
  </>
);

// @ts-expect-error the Switch props type stays internal; the package exports no SwitchProps name
export type { SwitchProps as PublicSwitchProps } from '../../index';
