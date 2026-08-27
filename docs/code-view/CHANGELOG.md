# Changelog — CodeView

## Unreleased (targets the next `@openzeppelin/ui-components` minor)

### Added

- `decorateToken?: CodeViewTokenDecorator` on `CodeViewProps`: an optional callback
  invoked once per highlighted text run with the run's text, its offset into `source`,
  and the enclosing `hljs-*` class if any. Return `undefined` to keep the default, or a
  React node containing the same characters to render in its place. See
  [Pattern 4](./integration-guide.md#pattern-4-decorate-tokens).
- Types `CodeViewTokenDecorator`, `CodeViewDecorationContext`, and `CodeViewToken`,
  exported from `@openzeppelin/ui-components/code-view` alongside `CodeView`,
  `CodeViewProps`, and `CodeViewLanguage`.

### Changed

- Nothing observable. With `decorateToken` omitted, rendered output is identical to the
  previous release for every language, including the plaintext fallback. Tokenization
  is still memoized on `source` and `language` only. No new subpath, dependency, or
  peer; the main entry still exports nothing from this feature.

### Guarantees worth knowing

- Decoration is presentational. The kit visits every run in order and substitutes the
  decorator's node for that run only; it cannot skip, reorder, or rewrite text. Byte
  identity of `code.textContent` with `source` under active decorators is asserted by
  the kit's tests. The consumer's side of the contract is to return the run's characters
  exactly.
- A throwing decorator falls back to default rendering for that run only. The pane stays
  up; nothing propagates.
- The seam is domain-free: no built-in decorations, link types, URL templates, or
  registries. The callback matches text (with offsets), not token classes.

### Migration Guide

- **Existing consumers:** no action. The prop is optional and its absence is the
  previous behaviour.
- **New decorator authors:** read [`CodeViewTokenDecorator`](./api-reference.md#codeviewtokendecorator)
  for the return contract, then follow [Pattern 4](./integration-guide.md#pattern-4-decorate-tokens).
  Only `undefined` / `null` mean "keep the default"; add one test asserting
  `code.textContent === source`.
