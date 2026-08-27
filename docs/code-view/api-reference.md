# CodeView — API Reference

Everything exported from `@openzeppelin/ui-components/code-view`. There are exactly six
public members: one component and five types. Nothing about this feature is exported from
the package's main entry.

```ts
import {
  CodeView,
  type CodeViewProps,
  type CodeViewLanguage,
  type CodeViewTokenDecorator,
  type CodeViewDecorationContext,
  type CodeViewToken,
} from '@openzeppelin/ui-components/code-view';
```

- [`CodeView`](#codeview) — the component
- [`CodeViewProps`](#codeviewprops) — its props
- [`CodeViewLanguage`](#codeviewlanguage) — the closed language union
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
memoized on `source` and `language`; the other props, `decorateToken` included, can
change freely without re-tokenizing.

**Behavior guarantees**

| Guarantee | Detail |
|---|---|
| Exact text | `code.textContent` equals `source`. Spaces, tabs, line breaks, and trailing newlines are preserved. Nothing is trimmed or normalized. |
| Never empty | Every input renders the focusable region. Empty `source` renders an empty, still-named, still-focusable `<pre>`. |
| Fail-soft | If the tokenizer throws, or a runtime caller passes a `language` outside the union, the source renders as plain text. If `decorateToken` throws, only that run of text falls back to default rendering. No error UI, no exception through React. |
| Decoration is presentational | `decorateToken` can change the elements a run of text is rendered in, never the text. Omitting it yields output identical to a pane without the feature. |
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

These five props are the entire surface. `CodeView` does not accept arbitrary DOM
attributes, `style`, `ref`, a theme object, event handlers, or line-number options.

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
