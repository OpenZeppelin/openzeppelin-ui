import { createContext } from 'react';

import type { AddressLabelResolver } from '@openzeppelin/ui-types';

/**
 * @internal Shared context instance consumed by both AddressDisplay and
 * AddressLabelProvider. Kept in its own file so component files export
 * only components (required by React Fast Refresh).
 */
export const AddressLabelContext = createContext<AddressLabelResolver | null>(null);
