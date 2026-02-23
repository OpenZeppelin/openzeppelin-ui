/**
 * Shared demo database instance.
 *
 * Used by both the global alias providers in AppProviders and the
 * AccountAliasDemo component so aliases are consistent across the app.
 */
import { createDexieDatabase, getAliasSchema } from '@openzeppelin/ui-storage';

export const demoDb = createDexieDatabase('example-app', [
  { version: 1, stores: getAliasSchema() },
]);
