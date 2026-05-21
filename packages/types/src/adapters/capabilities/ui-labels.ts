/**
 * **Tier 1** — Ecosystem-specific UI copy overrides (avoids hard-coded chain jargon).
 *
 * Does not extend {@link RuntimeCapability}.
 */
export interface UiLabelsCapability {
  /**
   * Key/value map consumed by shared UI (relayer panels, transaction widgets, etc.).
   *
   * @returns Record of label keys to translated strings; may be empty.
   */
  getUiLabels(): Record<string, string>;
}
