import { createContext } from 'react';

import type { AddressLabelResolver, AddressNameResolver } from '@openzeppelin/ui-types';

/**
 * @internal Shared context instance consumed by both AddressDisplay and
 * AddressLabelProvider. Kept in its own file so component files export
 * only components (required by React Fast Refresh).
 */
export const AddressLabelContext = createContext<AddressLabelResolver | null>(null);

/**
 * @internal Shared context instance consumed by AddressDisplay,
 * AddressNameProvider, and useAddressName. Sibling of AddressLabelContext
 * (SF-4 INV-122): carries a synchronous, value-only reverse-name resolver.
 * Defaults to `null` — no provider means no resolution and a byte-identical
 * zero-injection render (INV-54).
 */
export const AddressNameContext = createContext<AddressNameResolver | null>(null);
