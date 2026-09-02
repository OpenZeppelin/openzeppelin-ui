# Changelog — CodeView

## Unreleased (targets the next `@openzeppelin/ui-components` minor)

### Added

- `reveal?: CodeViewReveal` on `CodeViewProps`: a controlled, 1-indexed inclusive line
  range (`startLine`, `endLine`, optional `id`). The pane wraps those lines in a `<mark>`
  and scrolls it into view once. Re-reveal the same lines by changing `id`; a new object
  with the same numbers does nothing. Invalid ranges (zero, negative, non-integer,
  inverted, past the end, or on empty `source`) are silent no-ops, never clamped.
  Revealing a range does not turn line numbers on; that is `showLineNumbers`, and the two
  compose. See [Pattern 5](./integration-guide.md#pattern-5-reveal-a-line-range).
- Type `CodeViewReveal`, exported from `@openzeppelin/ui-components/code-view`.
- `showLineNumbers?: boolean` on `CodeViewProps`, default `false`: a 1-indexed
  line-number column to the left of the code. The numbers are CSS generated content, so
  they never appear in `textContent`, cannot be copied with a selection of the code, and
  are hidden from assistive technology. The row count is the same line count `reveal`
  validates against, so a file ending in a newline gets a numbered empty final line that
  is also a revealable range. Colour them with the `--code-view-line-number-color`
  custom property on any ancestor; it falls back to the kit's muted-foreground token, and
  it is the only supported hook — the column's classes and attributes are private. The
  column assumes the pane's own non-wrapping layout, which is the only mode it ships. See
  [Pattern 6](./integration-guide.md#pattern-6-show-line-numbers).
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

- Nothing observable. With `decorateToken`, `reveal`, and `showLineNumbers` omitted,
  rendered output is identical to the previous release for every language, including the
  plaintext fallback. Tokenization is still memoized on `source` and `language` only;
  changing `reveal` does not re-tokenize, and neither does turning the gutter on. No new
  subpath, dependency, or peer; the main entry still exports nothing from this feature.
- Within the unreleased feature, reveal now leaves two lines of context above the range
  instead of putting its first line flush against the top edge. Top alignment is
  unchanged and deliberate — it is what gives the range the pane instead of the half a
  centred first line left it — and the gap is a fixed two lines rather than a proportion,
  so a range that fits the pane less those two lines is still brought fully into view.
  It is expressed in `lh` units, so it stays two lines of context at any font size.

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
- **Consumers who want line numbers:** add `showLineNumbers`. Nothing else changes, and
  it is worth pairing with `reveal` — a reader jumped to line 207 in a pane with no
  numbers has no way to see that it is line 207. If you already theme the pane's colours
  through a scoped wrapper, add `--code-view-line-number-color` to it. See
  [Pattern 6](./integration-guide.md#pattern-6-show-line-numbers).
- **New decorator authors:** read [`CodeViewTokenDecorator`](./api-reference.md#codeviewtokendecorator)
  for the return contract, then follow [Pattern 4](./integration-guide.md#pattern-4-decorate-tokens).
  Only `undefined` / `null` mean "keep the default"; add one test asserting
  `code.textContent === source`.
