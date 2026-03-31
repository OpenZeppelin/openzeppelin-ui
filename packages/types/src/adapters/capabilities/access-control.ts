import type { AccessControlService } from '../access-control';
import type { RuntimeCapability } from '../runtime';

/**
 * **Tier 3** — Access control, ownership, roles, and history surfaced by the adapter.
 *
 * Extends `RuntimeCapability`. This interface is a **direct promotion** of
 * {@link AccessControlService}: same methods, types, and error semantics (FR-013).
 */
export interface AccessControlCapability extends RuntimeCapability, AccessControlService {}
