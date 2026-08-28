# Changelog — CodeView

## Unreleased (targets the next `@openzeppelin/ui-components` minor)

### Added

- `reveal?: CodeViewReveal` on `CodeViewProps`: a controlled, 1-indexed inclusive line
  range (`startLine`, `endLine`, optional `id`). The pane wraps those lines in a `<mark>`
  and scrolls it into view once. Re-reveal the same lines by changing `id`; a new object
  with the same numbers does nothing. Invalid ranges (zero, negative, non-integer,
  inverted, past the end, or on empty `source`) are silent no-ops, never clamped. No
  line-number gutter is added. See
  [Pattern 5](./integration-guide.md#pattern-5-reveal-a-line-range).
- Type `CodeViewReveal`, exported from `@openzeppelin/ui-components/code-view`.
- `CODE_VIEW_LANGUAGES` (the readonly list of `CodeViewLanguage` members) and the
  `isCodeViewLanguage(value: string)` type guard, for narrowing a language id that came
  from data rather than a literal.
- `decorateToken?: CodeViewTokenDecorator` on `CodeViewProps`: an optional callback
  invoked once per highlighted text run with the run's text, its offset into `source`,
  and the enclosing `hljs-*` class if any. Return `undefined` to keep the default, or a
  React node containing the same characters to render in its place. See
  [Pattern 4](./integration-guide.md#pattern-4-decorate-tokens).
- Types `CodeViewTokenDecorator`, `CodeViewDecorationContext`, and `CodeViewToken`,
  exported from `@openzeppelin/ui-components/code-view` alongside `CodeView`,
  `CodeViewProps`, and `CodeViewLanguage`.

### Changed

- Nothing observable. With `decorateToken` and `reveal` omitted, rendered output is
  identical to the previous release for every language, including the plaintext
  fallback. Tokenization is still memoized on `source` and `language` only; changing
  `reveal` does not re-tokenize. No new subpath, dependency, or
  peer; the main entry still exports nothing from this feature.

### Guarantees worth knowing

- Reveal is controlled, not imperative. There is no `ref`, handle, or `scrollTo()`.
  Retrigger compares `startLine`, `endLine`, and `id` by value, so a parent that
  re-renders with a fresh `reveal` object of the same numbers does not re-scroll.
- Reveal never moves focus and never throws. A range is resolved against the `source`
  on screen at that render; nothing about a previous file is remembered.
- Reveal composes with `decorateToken`. The decorator runs first on each run of text,
  then the mark wraps the result. `code.textContent === source` is asserted under
  reveal, decoration, and both. Where a decorated run straddles the range boundary,
  the mark wraps the whole decorated run, so paint may extend a few characters past
  the line; the text is unaffected.

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
- **Consumers who want to jump to lines:** pass `reveal={{ startLine, endLine }}`
  together with the `source` it belongs to, and change `id` when the same lines should
  scroll into view again. See [`CodeViewReveal`](./api-reference.md#codeviewreveal).
- **New decorator authors:** read [`CodeViewTokenDecorator`](./api-reference.md#codeviewtokendecorator)
  for the return contract, then follow [Pattern 4](./integration-guide.md#pattern-4-decorate-tokens).
  Only `undefined` / `null` mean "keep the default"; add one test asserting
  `code.textContent === source`.
