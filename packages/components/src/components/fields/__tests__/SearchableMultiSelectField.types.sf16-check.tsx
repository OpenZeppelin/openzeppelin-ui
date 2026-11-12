/**
 * 005 SF-16 INV-6 type contract. Compile-only fixture: `pnpm typecheck` (tsc --noEmit
 * over `src/**`) compiles it, and each `@ts-expect-error` fails the build if its line
 * ever stops being an error. Never imported at runtime; never exported from the package.
 */
import type { Control } from 'react-hook-form';

import {
  SearchableMultiSelectField,
  type SearchableMultiSelectFieldProps,
  type SearchableMultiSelectProps,
} from '../../../index';

interface Country {
  readonly code: string;
  readonly name: string;
}
type Values = { countries: string[]; other: string };

declare const control: Control<Values>;
declare const countries: readonly Country[];

const base = {
  id: 'c',
  name: 'countries' as const,
  label: 'Countries',
  control,
  items: countries,
};

// Happy: TItem is inferred from `items`, so the accessors are typed `Country`.
export const ok = (
  <SearchableMultiSelectField
    {...base}
    getItemId={(c) => c.code}
    getItemLabel={(c) => c.name}
    filterItem={(c, query) => c.name.startsWith(query)}
    searchPlaceholder="Search"
    searchLabel="Search countries"
    emptyText="None"
    formatSelectedCount={(n, total) => `${n}/${total}`}
    formatSelectionSummary={(n) => `${n}`}
    clearAllLabel="Clear"
    validateSelection={(ids) => ids.length <= 3 || 'Max 3'}
    readOnly
    helperText="Help"
    width="half"
    validation={{ required: true }}
  />
);

// Inference failure: an accessor using a field Country does not have.
export const badAccessor = (
  <SearchableMultiSelectField
    {...base}
    // @ts-expect-error -- Country has no `id`; TItem was inferred from `items`.
    getItemId={(c) => c.id}
    getItemLabel={(c) => c.name}
  />
);

// TFieldValues comes from `control`: `name` must be a path of Values.
export const badName = (
  <SearchableMultiSelectField
    {...base}
    // @ts-expect-error -- 'nope' is not a field path of Values.
    name="nope"
    getItemId={(c) => c.code}
    getItemLabel={(c) => c.name}
  />
);

const accessors = { getItemId: (c: Country) => c.code, getItemLabel: (c: Country) => c.name };

// Forbidden SF-15 pass-throughs: the field owns these, so they must not type-check.
// (TS never excess-checks hyphenated JSX attributes, so `aria-*` can't be compile errors at the
// call site. They are covered by the `noLeak` key check below and, at runtime, by the render
// suite's "stray aria-* is ignored" test.)
export const f1 = (
  <SearchableMultiSelectField
    {...base}
    {...accessors}
    // @ts-expect-error -- selectedIds is owned by the form value.
    selectedIds={[]}
  />
);
export const f2 = (
  <SearchableMultiSelectField
    {...base}
    {...accessors}
    // @ts-expect-error -- onSelectionChange is bound to field.onChange.
    onSelectionChange={() => {}}
  />
);
export const f3 = (
  <SearchableMultiSelectField
    {...base}
    {...accessors}
    // @ts-expect-error -- ref is the form ref.
    ref={null}
  />
);
export const f4 = (
  <SearchableMultiSelectField
    {...base}
    {...accessors}
    // @ts-expect-error -- onBlur is the touched gate.
    onBlur={() => {}}
  />
);
export const f5 = (
  <SearchableMultiSelectField
    {...base}
    {...accessors}
    // @ts-expect-error -- onOpenChange feeds the gate.
    onOpenChange={() => {}}
  />
);
export const f6 = (
  <SearchableMultiSelectField
    {...base}
    {...accessors}
    // @ts-expect-error -- disabled: use readOnly.
    disabled
  />
);
export const f7 = (
  <SearchableMultiSelectField
    {...base}
    {...accessors}
    // @ts-expect-error -- className is not on the field surface.
    className="x"
  />
);

// validateSelection gets readonly ids and returns boolean | string only.
export const badRule = (
  <SearchableMultiSelectField
    {...base}
    {...accessors}
    // @ts-expect-error -- a number is not a valid rule result.
    validateSelection={(ids) => ids.length}
  />
);

// SF-15 gained an optional onOpenChange (INV-14).
export const smsOpen: SearchableMultiSelectProps<Country>['onOpenChange'] = (open: boolean) => {
  void open;
};

// The props type is exported and narrow: none of the forbidden keys exist on it.
type Forbidden =
  | 'selectedIds'
  | 'onSelectionChange'
  | 'ref'
  | 'onBlur'
  | 'onOpenChange'
  | 'disabled'
  | 'className'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'aria-invalid'
  | 'aria-required';
type Leaked = Extract<keyof SearchableMultiSelectFieldProps<Country, Values>, Forbidden>;
export const noLeak: [Leaked] extends [never] ? true : false = true;
