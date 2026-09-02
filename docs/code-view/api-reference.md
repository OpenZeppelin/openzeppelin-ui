# CodeView — API Reference

Everything exported from `@openzeppelin/ui-components/code-view`. There are exactly nine
public members: one component, six types, one constant, and one type guard. Nothing
about this feature is exported from the package's main entry.

```ts
import {
  CodeView,
  CODE_VIEW_LANGUAGES,
  isCodeViewLanguage,
  type CodeViewProps,
  type CodeViewLanguage,
  type CodeViewReveal,
  type CodeViewTokenDecorator,
  type CodeViewDecorationContext,
  type CodeViewToken,
} from '@openzeppelin/ui-components/code-view';
```

- [`CodeView`](#codeview) — the component
- [`CodeViewProps`](#codeviewprops) — its props
- [`CodeViewLanguage`](#codeviewlanguage) — the closed language union
- [`CODE_VIEW_LANGUAGES` and `isCodeViewLanguage`](#code_view_languages-and-iscodeviewlanguage) — the union as runtime data
- [`CodeViewReveal`](#codeviewreveal) — the controlled line range to mark and scroll to
- [`CodeViewTokenDecorator`](#codeviewtokendecorator) — the optional decoration callback
- [`CodeViewDecorationContext`](#codeviewdecorationcontext) — what the callback receives
- [`CodeViewToken`](#codeviewtoken) — one run of text, with its offset
- [Rendered DOM](#rendered-dom) — what the component puts on the page
- [Token classes](#token-classes) — the `hljs-*` names you can target

---

## `CodeView`

```ts
function CodeView(props: CodeViewProps): React.ReactElement;
```

Renders `props.source` as a read-only, syntax-highlighted code region.

The component is a pure function of its props. It owns no state, registers no event
listeners, and performs no I/O. Tokenization happens synchronously during render and is
memoized on `source` and `language`; the other props, `decorateToken` and `reveal`
included, can change freely without re-tokenizing.

**Behavior guarantees**

| Guarantee | Detail |
|---|---|
| Exact text | `code.textContent` equals `source`. Spaces, tabs, line breaks, and trailing newlines are preserved. Nothing is trimmed or normalized. |
| Never empty | Every input renders the focusable region. Empty `source` renders an empty, still-named, still-focusable `<pre>`. |
| Fail-soft | If the tokenizer throws, or a runtime caller passes a `language` outside the union, the source renders as plain text. If `decorateToken` throws, only that run of text falls back to default rendering. No error UI, no exception through React. |
| Decoration is presentational | `decorateToken` can change the elements a run of text is rendered in, never the text. Omitting it yields output identical to a pane without the feature. |
| Reveal is controlled | `reveal` is a prop, not a method. The pane marks the named lines and scrolls the start of the range near the top of the visible area — two lines short of the edge — when `startLine`, `endLine`, or `id` change by value. There is no `ref` and no handle. Omitting it yields output identical to a pane without the feature. |
| Line numbers are opt-in | `showLineNumbers` is off by default. The numbers are CSS generated content, so they are absent from `textContent`, cannot be copied with a selection, and are hidden from assistive technology. |
| Reveal never clamps or throws | A `reveal` that does not name an existing, ordered, 1-indexed range of the current `source` produces no mark and no scroll. Nothing is adjusted to fit. |
| Reveal never moves focus | Revealing scrolls the region's content. It does not call `focus()` on anything and adds no tab stop. |
| No injection | Output is built from React text nodes and `<span>` elements with class names only. There is no `dangerouslySetInnerHTML` and no HTML parsing. |
| Native navigation | Scrolling, text selection, copying, and browser find work as on any static text. No keyboard shortcuts are intercepted. |
| No announcements | There is no `aria-live` region. Changing `source` does not trigger screen-reader announcements. |

**Returns:** a single `<pre>` element containing a single `<code>` element. See
[Rendered DOM](#rendered-dom).

**Throws:** never, for any `source` string and any `language` value.

**Example**

```tsx
<CodeView
  source={cargoToml}
  language="toml"
  aria-label="Cargo.toml source code"
  className="h-96"
/>
```

---

## `CodeViewProps`

```ts
interface CodeViewProps {
  /** Source text to render. Whitespace and trailing newlines are preserved. */
  readonly source: string;

  /** Explicit grammar selection. CodeView does not infer from a filename. */
  readonly language: CodeViewLanguage;

  /** Classes applied to the focusable, scrolling pre element. */
  readonly className?: string;

  /** Accessible name for the scrolling code region. Defaults to "Source code". */
  readonly 'aria-label'?: string;

  /**
   * Optional per-leaf decoration. Called once for every run of highlighted text.
   * Omitted → output identical to a pane without the feature.
   */
  readonly decorateToken?: CodeViewTokenDecorator;

  /**
   * Optional 1-indexed inclusive line range to mark and bring into view.
   * Omitted → no mark, no scroll; output identical to a pane without the feature.
   */
  readonly reveal?: CodeViewReveal;

  /**
   * Show a 1-indexed line-number column to the left of the code.
   * Omitted or false → output identical to a pane without the feature.
   */
  readonly showLineNumbers?: boolean;
}
```

### `source` (required)

`string` — the text to display. Any string is valid, including the empty string, text
containing HTML-like markup, and multi-megabyte inputs (though see the size note in the
[integration guide](./integration-guide.md#large-files)). The component never modifies
it.

### `language` (required)

[`CodeViewLanguage`](#codeviewlanguage) — which grammar to tokenize with. Pass
`'plaintext'` to skip tokenization entirely. There is no default and no detection: the
caller always decides.

### `className` (optional)

`string` — appended to the outer `<pre>`. Use it to size and position the pane (height,
flex/grid placement, margins). It is merged after the component's own classes with the
kit's `cn()` helper, so Tailwind utilities you pass win over the defaults for the same
property. It does **not** reach the inner `<code>` or the token spans; for token colors
see [Theming](./integration-guide.md#pattern-3-apply-a-highlightjs-theme).

### `aria-label` (optional)

`string` — accessible name of the focusable region. Defaults to `"Source code"`. When
you show one pane per file, name it after the file (`"deploy.sh source code"`) so a
screen-reader user landing on the region knows which document it is.

### `decorateToken` (optional)

[`CodeViewTokenDecorator`](#codeviewtokendecorator) — a callback invoked once for every
run of text the highlighter produced, in source order, during render. Return `undefined`
or `null` to keep the default rendering of that run; return a React node to render in
its place. Omit the prop and nothing changes: the output is identical to the pane
before this prop existed, so upgrading requires no action from consumers who do not
decorate.

The callback is not part of the tokenization memo. Passing a new function identity
re-renders the decorated output but does not re-tokenize `source`. Stabilize it with
`useCallback` when its dependencies are stable, as you would any render-time callback.

Two things the kit guarantees about the callback, and one it asks of you:

- It runs only when highlighting is active. With `language="plaintext"`, or after a
  tokenizer failure, there are no runs to visit and the callback is never called.
- If it throws, the throw is caught at that run; the run renders with its default
  highlighting and every other run is unaffected. Nothing propagates through
  `CodeView`.
- The node you return must contain exactly the characters of `token.text`, in order.
  The kit visits every run and never skips one, so as long as each decoration keeps its
  characters, `code.textContent === source` still holds under decoration. This is
  what makes decoration presentational rather than editorial; see
  [`CodeViewTokenDecorator`](#codeviewtokendecorator).

### `reveal` (optional)

[`CodeViewReveal`](#codeviewreveal) — a 1-indexed, inclusive line range. When it names
lines that exist in `source`, the pane wraps the characters of those lines in a `<mark>`
and, on the render where `startLine`, `endLine`, or `id` changed, scrolls the start of
that range to the top of the pane. Omit the prop and nothing changes: no mark, no scroll,
and the output is identical to the pane before this prop existed.

Four rules govern it; each is spelled out under [`CodeViewReveal`](#codeviewreveal):

- **The range is top-aligned, not centred, and two lines of context are kept above it.**
  The first revealed line goes two lines below the top of the visible area, so nearly the
  whole pane height is available to the rest of the range. A range at most as tall as the
  pane less those two lines is therefore brought fully into view, and a taller range
  starts at that offset with its remainder below the fold, reachable by scrolling. There
  is no prop to choose a different alignment or a different gap: the pane knows its own
  height and the caller does not, so picking both is the pane's job.

- **Comparison is by value.** The pane reads `startLine`, `endLine`, and `id` and
  compares each with `Object.is`. The identity of the `reveal` object is never
  consulted. Passing `reveal={{ startLine: 4, endLine: 4 }}` inline is fine: a parent
  re-render that allocates a new object with the same numbers does not scroll again.
- **Re-reveal by changing `id`.** To scroll to the same lines a second time, pass a
  different `id`. Nothing else re-triggers the scroll, not a new object, not a change to
  `source`, not a change to `decorateToken`.
- **Invalid is a no-op.** See the [validity table](#validity). No exception, no
  console output, no clamping.

`reveal` is not part of the tokenization memo. Changing it re-renders the marked output
from the already-tokenized tree; it does not re-tokenize `source`. The mark and the
scroll are the whole effect: reveal adds no anchors, no announcement, and no line-number
gutter — the gutter is `showLineNumbers`, and revealing a range in a pane that did not
ask for one does not turn it on.

---

### `showLineNumbers` (optional)

`boolean`, default `false`. Renders a 1-indexed line-number column to the left of the
code.

The numbers are painted as CSS generated content on empty elements, which is what makes
three things true at once:

- `code.textContent === source` and `pre.textContent === source` still hold, so the
  pane's source-fidelity guarantee is unaffected.
- No selection can include a number, so copying a block of code copies source characters
  only. This is a property of generated content, not of a `user-select` rule that a
  browser might ignore.
- The column carries `aria-hidden`, so assistive technology reads one document in one
  order and the `<pre>` stays the only tab stop.

The row count is the same line count `reveal` validates against, so the two can never
disagree: a file ending in a newline opens an empty final line, and that line both gets a
number and can be revealed.

Rows are one logical line tall. The pane paints `whitespace-pre` and exposes no wrapping
option, so rows and code lines line up exactly and a long line scrolls sideways beneath a
column that stays pinned to the left edge. A consumer stylesheet that forces soft
wrapping on the `<code>` element is outside this contract and will put the two out of
step.

Colour the numbers by setting `--code-view-line-number-color` on any ancestor; it falls
back to the kit's muted-foreground token. That property is the supported theming hook —
the column's own attributes and classes are private.

These seven props are the entire surface. `CodeView` does not accept arbitrary DOM
attributes, `style`, `ref`, a theme object, event handlers, or reveal-alignment options.

---

## `CodeViewLanguage`

```ts
type CodeViewLanguage = 'rust' | 'toml' | 'shell' | 'json' | 'markdown' | 'plaintext';
```

A closed union. Five members select a registered highlight.js grammar; `'plaintext'`
bypasses the tokenizer and renders the source unstyled.

| Member | Grammar | Notes |
|---|---|---|
| `'rust'` | `rust` | Contract sources, `lib.rs`, tests. |
| `'toml'` | `ini` | highlight.js has no TOML grammar; `ini` is the conventional stand-in and covers `[tables]`, `key = "value"`, and `#` comments. |
| `'shell'` | `bash` | POSIX shell and bash scripts. |
| `'json'` | `json` | |
| `'markdown'` | `markdown` | |
| `'plaintext'` | — | No spans are emitted. Use for any file kind not listed. |

The set is fixed by design: it is the set of file kinds OpenZeppelin's Stellar code
generation produces, and the kit does not aim to be a general-purpose highlighter.
Requesting another language is a compile-time error in TypeScript. If a JavaScript
caller passes an unlisted string at runtime, the component treats it as a tokenizer
failure and renders plain text; it does not throw.

Consumers cannot register additional grammars. The registry is private to the module
and finalized when the subpath loads.

---

## `CODE_VIEW_LANGUAGES` and `isCodeViewLanguage`

```ts
const CODE_VIEW_LANGUAGES: readonly CodeViewLanguage[];

function isCodeViewLanguage(value: string): value is CodeViewLanguage;
```

The [`CodeViewLanguage`](#codeviewlanguage) union as runtime data, for the case where a
language id arrives from data (a file manifest, a URL, a saved preference) rather than
from a literal in your code.

- **`CODE_VIEW_LANGUAGES`** — the six members, in the order listed above. Read-only;
  do not mutate it.
- **`isCodeViewLanguage(value)`** — `true` when `value` is one of those six strings,
  narrowing the argument to `CodeViewLanguage`. Use it instead of a cast: a cast of an
  unlisted string compiles and then silently renders as plain text at runtime, while the
  guard lets you decide what to do (fall back to `'plaintext'` explicitly, warn, or
  reject) where you still know the value's provenance.

```ts
import { isCodeViewLanguage, type CodeViewLanguage } from '@openzeppelin/ui-components/code-view';

function languageFromManifest(id: string): CodeViewLanguage {
  return isCodeViewLanguage(id) ? id : 'plaintext';
}
```

---

## `CodeViewReveal`

```ts
interface CodeViewReveal {
  /** First line to include. 1 is the first line of `source`. */
  readonly startLine: number;
  /** Last line to include. Must be >= startLine. */
  readonly endLine: number;
  /**
   * Retrigger token. Compared with Object.is.
   * Change this value to scroll again when the line numbers did not change.
   * Omit it if you never need to re-reveal the same range.
   */
  readonly id?: number | string;
}
```

The type of the [`reveal`](#reveal-optional) prop: a closed, inclusive range of lines to
mark and scroll into view, plus an optional token for asking the pane to scroll there
again.

**Why a prop and not a method.** Every primitive in this kit is controlled: the host
owns the state and the component renders it. A `ref.current.reveal()` call would be the
sole imperative exception, and it would need hidden state inside the pane to remember
what it last revealed, state that can stick to the wrong file when `source` changes. So
the host holds the range (next to whatever selected-file state it already has) and
passes it down. What the pane shows is always a function of the props it was given on
this render.

### Fields

| Field | Type | Meaning |
|---|---|---|
| `startLine` | `number` | First line to mark, **1-indexed**. `1` is the first line of `source`. |
| `endLine` | `number` | Last line to mark, **inclusive**. `startLine === endLine` marks one line. The mark covers the whole line, including its trailing line break when there is one. |
| `id` | `number \| string`, optional | Retrigger token. Change it to scroll to the same lines again. Omit it if you never need that; an omitted `id` is `undefined` and is stable. |

Lines are delimited by `\n` (U+000A) only. A `\r` is an ordinary character on its line.
An empty `source` has zero lines; a non-empty `source` has one more line than it has
`\n` characters, so a file ending in a newline has an empty last line that a range may
legitimately include.

### Comparison

On each render the pane reads the three fields out of `reveal` and compares each to the
previous render's value with `Object.is`. Object identity is never compared. The
consequences:

| You pass, compared with the last render | Mark | Scroll |
|---|---|---|
| Same `startLine`, `endLine`, and `id`, in a **new object** | unchanged | **no** |
| Different `startLine` or `endLine` | rebuilt for the new lines | yes |
| Same lines, different `id` | unchanged | yes |
| Same lines and `id`, different `source` | rebuilt against the new text | **no** |
| `reveal` removed (`undefined`) | removed | no |

The first and fourth rows are the ones to hold on to. A host that regenerates `source`
on every keystroke (a live preview) keeps its mark on the named lines of each new text,
but the pane does not re-scroll under the user's cursor each time. And a component that
re-renders constantly, such as one inside a drag-resizable panel, can build `reveal`
inline without the pane yanking the user back to the range on every frame.

`id` is deliberately excluded from the work of rebuilding the mark: changing only `id`
re-scrolls without re-rendering the marked tree.

### Alignment

When the pane scrolls, it puts the first line of the range two lines below the top of the
visible area. It does not centre the range, and there is no prop to change either the
alignment or the size of that gap.

Centring is the wrong default for a range, as opposed to a point. Anchoring the first
line to the midpoint leaves only half the pane height for everything after it, so a range
taller than half the pane hangs off the bottom while the top half of the pane sits empty.
Top-aligning gives the range nearly the full height instead:

| Range height relative to the pane | Result |
|---|---|
| Fits in the pane, less the two-line gap | Brought fully into view, first line two lines down |
| Taller than that | Starts two lines down; the remainder is below the fold and reachable by scrolling |

The two-line gap is a fixed cost, not a proportion: it is there so the range does not sit
flush against the edge with nothing to show the file continues above, and it is small
enough that the difference from a flush top alignment is two lines rather than half a
pane. It is expressed in `lh` units, so it stays two lines of context at whatever font
size you give the pane.

The pane is the only party that knows its own rendered height, so it owns this decision
rather than exposing an alignment option the caller would have to compute a range height
to use correctly.

### Validity

A range is resolved against the `source` on this render and nothing else. Every row
below yields no mark and no scroll; none throws, none logs, and none is adjusted to fit.

| `reveal` | Result | Why not clamp |
|---|---|---|
| omitted / `undefined` | nothing | Baseline. Output identical to a pane without the feature. |
| `startLine` or `endLine` not an integer (`1.5`, `NaN`, `Infinity`) | nothing | There is no line 1.5. |
| `startLine` or `endLine` is `0` or negative | nothing | Lines are 1-indexed. Clamping `0` to `1` would hide an off-by-one in the caller. |
| `startLine > endLine` | nothing | Swapping the bounds would guess at intent. |
| `startLine` or `endLine` greater than the line count | nothing | Painting to the end of a shorter file would look like success for a range that belongs to a different file. |
| `source === ''` | nothing | Zero lines; there is nothing to reveal. |

Valid: `1 <= startLine <= endLine <= lineCount`, both integers, `source` non-empty. The
common one-line hit, `{ startLine: n, endLine: n }`, is valid for any `n` in range.

**Stale ranges.** Because resolution is against the current `source`, a range computed
from a previous version of the text, or from a different file, is not an error. If the
line numbers still exist, those lines in the *current* text are marked, which may or may
not be the content you meant. If they do not exist, nothing is marked, and the previous
mark does not linger. The pane keeps no memory of an earlier `source`, and
`CodeViewReveal` has no `path` field for it to key on; pairing the range with the text it
was computed from is the caller's job. Update `source` and `reveal` in the same render
(one state update, or two in the same event handler), or omit `reveal` until the range
for the new text is ready.

### With `decorateToken`

Both features may apply to the same text. The order on each run of text is fixed:
`decorateToken` sees the intact run first and returns its node; the pane then wraps the
part of that output that falls inside the range in the reveal `<mark>`. The decorator is
called exactly as often with `reveal` as without it, and `code.textContent === source`
holds under reveal alone, decoration alone, and both; the kit's tests assert this
byte-for-byte.

One presentational consequence to know. When a run of text straddles the range boundary
(part of it on a revealed line, part not) and the decorator returned the default (nothing),
the pane slices the run and marks only the characters inside the range. If instead the
decorator returned a custom node for that run, the pane does not take that node apart: it
wraps the whole node in the mark, so the highlight may extend a few characters past the
line boundary. This affects paint only. The text is unchanged either way, and the source
characters remain exactly what the user would download.

**Example**

```tsx
import { CodeView, type CodeViewReveal } from '@openzeppelin/ui-components/code-view';

const reveal: CodeViewReveal = { startLine: 2, endLine: 4 };

export function RevealedSnippet({ source }: { source: string }) {
  return <CodeView source={source} language="rust" reveal={reveal} aria-label="lib.rs source code" />;
}
```

---

## `CodeViewTokenDecorator`

```ts
type CodeViewTokenDecorator = (
  context: CodeViewDecorationContext
) => React.ReactNode | null | undefined;
```

The type of the [`decorateToken`](#decoratetoken-optional) prop. It is called once per
run of text with a [`CodeViewDecorationContext`](#codeviewdecorationcontext) and decides
how that one run is rendered.

**Return value**

| You return | The pane renders |
|---|---|
| `undefined` or `null` | The default for that run: the bare text, inside its `hljs-*` span if it has one. |
| Any other `React.ReactNode` | Your node, in place of the text. If the run sits inside a highlighted span, the span and its `hljs-*` class stay and your node becomes the span's child. If the run is unclassified text at the top level, your node is inserted at the top level. |

Only `undefined` and `null` mean "keep the default". Returning `false`, `''`, or `0`
is a request to render that (React renders `false` and `''` as nothing), which would
drop the run's text from the pane. Do not use them as a skip signal.

**What you may return.** Anything React can render, provided it contains the characters
of `token.text` exactly once, in order. The common shapes:

- the same text wrapped once: `<mark>{token.text}</mark>`, `<a href={url}>{token.text}</a>`;
- the text split around a substring, as a fragment:
  `<>{before}<a href={url}>{match}</a>{after}</>`, where
  `before + match + after === token.text`.

**What the callback is for, and what it is not.** It matches **text, not token types.**
The context does tell you the `hljs-*` class of the enclosing span when there is one,
and you can use it to narrow (decorate only comments, skip strings). But the things
consumers want to point at (a module path in an import, an identifier, a name inside a
string) are usually *not* wrapped in a classified span; highlighters classify keywords,
strings, and comments, and leave connective text as-is. That is why the seam hands you
text with an offset: you find your match with a string comparison or a regular
expression against `token.text`, and you use `token.offset` when you need to know where
in `source` you are (which line, what precedes it). A seam keyed on class names would
not reach the content that matters.

**Fidelity is your side of the contract.** The kit visits every run in order and
substitutes your node for that run's default only; it never skips a run, never reorders
runs, and never lets an exception escape. If every decoration you return contains its
run's characters, the rendered text equals `source`. If a decoration drops or changes
characters, the pane shows something the user will not find in the file they download.
The kit does not diff your output against the text at runtime (that would cost a
comparison on every run in production); it documents the requirement here and proves
the kit's side with byte-identity tests. Write a test for your decorator that asserts
`code.textContent === source` on a representative input.

**Failure.** A throw inside the callback is caught at that run. The run renders with
default highlighting and the rest of the pane is unaffected. There is no error callback,
no logging, and no partial-failure signal; a decorator that keeps throwing is
indistinguishable from one that keeps returning `undefined`. Test your decorator.

**What the kit does not provide.** No built-in decorations, no link or mark helpers, no
URL templates, no map from names to destinations, no convenience overloads, no
decorator array or registry. If you have several policies, compose them in one
function. This is deliberate: the kit provides the capability, the consumer provides the
meaning, and nothing about any one product's domain sits in the published type surface.

---

## `CodeViewDecorationContext`

```ts
interface CodeViewDecorationContext {
  readonly source: string;
  readonly language: CodeViewLanguage;
  readonly token: CodeViewToken;
}
```

The single argument to a [`CodeViewTokenDecorator`](#codeviewtokendecorator).

- **`source`** — the full `source` prop, unchanged. Use it with `token.offset` for
  context beyond the run itself: `source.lastIndexOf('\n', token.offset - 1) + 1` is
  the start of the run's line.
- **`language`** — the `language` prop. Gate on it when a decoration only makes sense
  for one grammar.
- **`token`** — the run of text being rendered; see [`CodeViewToken`](#codeviewtoken).

The object is built fresh for each call. Do not hold on to it across renders.

---

## `CodeViewToken`

```ts
interface CodeViewToken {
  /** Exact substring of `source` rendered by this leaf. */
  readonly text: string;
  /** Start offset of this leaf in the full `source` string. */
  readonly offset: number;
  /**
   * `hljs-*` classes from the immediate parent span, if the leaf sits inside one.
   * Undefined for unclassified text.
   */
  readonly className?: string;
}
```

One run of text as the highlighter emitted it: a "text leaf" in the highlighter's
output, which is to say a maximal stretch of characters with a single classification
(or none). It is not a lexical token in the compiler sense; a run of unclassified text
may span several words, spaces, and punctuation, and a keyword and the space after it
are two different runs.

- **`text`** — the characters. Always satisfies
  `source.slice(offset, offset + text.length) === text`. Never empty.
- **`offset`** — the index of `text[0]` in `source`, counted in UTF-16 code units, the
  same unit as `String.prototype.length` and `slice`. Runs are visited in ascending
  offset order and cover `source` without gaps, so the offset of each run is the
  previous run's `offset + text.length`.
- **`className`** — the space-joined class list of the *immediate* enclosing span
  (`'hljs-keyword'`, `'hljs-title function_'`), or `undefined` when the run is
  top-level text with no span. Classes of outer ancestors are not merged in. This is
  informational: it lets you narrow (skip runs whose `className` includes
  `hljs-string`, say), and it tells you that a non-nullish return will be rendered
  *inside* that span rather than replacing it.

Runs with no `className` are the norm for the connective text of a program: paths in
import statements, operators, identifiers the grammar does not classify, spaces and
newlines between tokens. If you are matching content rather than syntax, expect to do
most of your work on runs where `className` is `undefined`.

## Rendered DOM

```html
<pre tabindex="0" aria-label="Source code" class="overflow-auto rounded-md border … font-mono … focus-visible:ring-2 … {className}">
  <code class="hljs block min-w-full whitespace-pre …">
    <span class="hljs-keyword">pub</span> <span class="hljs-keyword">fn</span> <span class="hljs-title function_">hello</span>() {}
  </code>
</pre>
```

- The **`<pre>`** is the scroll container and the focus target. It receives
  `tabIndex={0}`, the accessible name, kit background/border/text tokens, the monospace
  stack, a `focus-visible` ring, and your `className`.
- The **`<code>`** carries the standard `hljs` class plus the kit's default token
  color mapping (see below). `white-space: pre` is set here, which is what preserves
  the source layout.
- **Token `<span>`s** carry standard highlight.js class names and nothing else: no
  `id`, `role`, `aria-*`, `tabindex`, `style`, or event handlers. Nested spans follow
  highlight.js's own nesting (for example `hljs-title function_`).
- With `language="plaintext"`, or after a tokenizer failure, the `<code>` contains a
  single text node and no spans.
- With `decorateToken` supplied, whatever your callback returns for a run appears where
  that run's text would have been: inside the run's `hljs-*` span if it had one, at the
  top level of `<code>` otherwise. The kit adds no wrapper of its own around decorated
  output. Everything above about token spans still holds for the spans the kit renders;
  the elements *you* return are yours, including any `href`, `tabindex`, or `role` they
  carry. An `<a href>` you return is a real link and a real tab stop.
- With a valid `reveal`, the characters of the named lines are wrapped in one or more
  `<mark>` elements, one per run of text (or part of a run) inside the range, so a
  three-line range over highlighted Rust yields several adjacent marks rather than one:

  ```html
  <span class="hljs-keyword"><mark>fn</mark></span><mark> </mark><span class="hljs-title function_"><mark>hello</mark></span><mark>() {}
  </mark>
  ```

  The marks sit *inside* the `hljs-*` spans, so token colors are unchanged under the
  highlight; the mark paints a translucent kit selected-color background, underlines the
  revealed run in that same color, and inherits its text color. Marks carry no `id`,
  `role`, `tabindex`, or `aria-*`. They may carry a private attribute the kit uses to
  tell its own marks from `<mark>` elements a decorator returned; it is not a published
  hook, and consumers must not select on it.
  If a decorator returned `<mark>` for a run inside the range, the two nest
  (`<mark><mark>fn</mark></mark>`), which is valid HTML with unchanged `textContent`.
  When the range covers only the empty line after a trailing newline, the mark is
  empty but present, so the pane still has something to scroll to.

## Token classes

Class names are exactly those highlight.js emits for the selected grammar; `CodeView`
adds, renames, and removes nothing. The default styling maps this subset to kit color
tokens; classes not in the list inherit `text-foreground` from the `<pre>`.

| `hljs-*` class | Default kit token |
|---|---|
| `comment`, `quote`, `meta`, `bullet`, `punctuation` | `--muted-foreground` |
| `keyword`, `selector-tag`, `section` | `--primary` |
| `built_in`, `type` | `--info` |
| `string`, `regexp` | `--success` |
| `number`, `literal` | `--warning` |
| `title`, `title.function_`, `title.class_`, `function`, `variable`, `params` | `--foreground` |
| `attr`, `attribute` | `--chart-2` |
| `name`, `tag` | `--chart-3` |
| `property` | `--chart-4` |
| `symbol` | `--destructive` |

These defaults are applied as descendant selectors from the `<code>` element (Tailwind
arbitrary variants of the form `[&_.hljs-keyword]:text-primary`). They are not a
stylesheet you import and they do not touch any `.hljs-*` element outside a `CodeView`.
The mapping is a styling default, not part of the typed API; the class names are the
stable contract.

The reveal `<mark>` is painted the same way, by a descendant rule from the `<code>`
element that applies only while a valid `reveal` is active: a translucent background from
the kit's `--selected` token, a 2px underline in `--selected` at a 4px offset, and
`color: inherit`, so a revealed keyword keeps its keyword color.

The underline is what makes the range findable, and it carries that job for a reason. A
range resolves to one `<mark>` per token run rather than one per line, so a border, ring,
or outline would repeat at every token boundary instead of framing the range; an
underline joins across adjacent inline boxes and draws once per revealed line. The
background stays a light wash on purpose: compositing `--selected` over `--background`
raises the band's luminance, and in the dark palette `--success` — the string color —
already sits near 2.3:1 against `--background`, so a heavier fill would cost the revealed
line the legibility the reveal exists to give it.

To restyle it, target `.hljs mark` under a class you pass through `className`, at the
same specificity discussed in
[Theming](./integration-guide.md#pattern-3-apply-a-highlightjs-theme).
