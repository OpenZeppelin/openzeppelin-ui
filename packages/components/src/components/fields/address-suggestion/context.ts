import { createContext } from 'react';

import type { AddressSuggestionResolver } from '@openzeppelin/ui-types';

/**
 * @internal Shared context instance consumed by both AddressField and
 * AddressSuggestionProvider. Kept in its own file so component files export
 * only components (required by React Fast Refresh).
 */
export const AddressSuggestionContext = createContext<AddressSuggestionResolver | null>(null);
