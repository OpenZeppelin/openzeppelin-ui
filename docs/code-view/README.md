# CodeView

> A read-only, syntax-highlighted code pane for `@openzeppelin/ui-components`, shipped
> as its own subpath so applications that never show code never load a highlighter.

## Overview

`CodeView` renders a string of source as one focusable, scrollable `<pre><code>` block
with highlight.js-compatible token classes. It is for applications that display
generated or fetched source (contract files, manifests, deploy scripts, config, READMEs)
without letting the user edit it. It is not an editor, not a form field, and does not
guess the language from a filename: you tell it which of five grammars to use, and
anything else renders as plain text. An optional `decorateToken` callback lets you wrap
pieces of the highlighted text in your own elements (links, marks, tooltips) without
the component ever changing the text itself.

The single most important thing to know: **import it from
`@openzeppelin/ui-components/code-view`, not from the package's main entry.** The main
entry deliberately does not export `CodeView`. That is the mechanism that keeps the
tokenizer out of every bundle that does not render code.

## Quick Start

```bash
pnpm add @openzeppelin/ui-components
```

`lowlight` and `highlight.js` are direct dependencies of the kit. There is nothing else
to install and no theme stylesheet to import.

```tsx
import { CodeView } from '@openzeppelin/ui-components/code-view';

export function LibRsPreview({ source }: { source: string }) {
  return <CodeView source={source} language="rust" aria-label="lib.rs source code" />;
}
```

That is the whole integration. The pane shows the exact text of `source`, colors Rust
tokens with the kit's design-system colors in light and dark mode, and lets the user
scroll, select, copy, and use browser find as they would on any text.

CommonJS consumers use the same subpath:

```js
const { CodeView } = require('@openzeppelin/ui-components/code-view');
```

Both conditions are published and verified against the packed tarball.

## Key Concepts

**Subpath-only export.** `CodeView` exists at `@openzeppelin/ui-components/code-view`
and nowhere else. `import { CodeView } from '@openzeppelin/ui-components'` is a compile
error, and that is intentional: the highlighter (a few kB of tokenizer plus five
grammars) is bundled only into the subpath's output. This is the same pattern the kit
uses for `./code-editor` and `./file-tree`.

**A closed language union.** `language` accepts exactly six values:

| `language`   | Grammar used          | Typical files                 |
|--------------|-----------------------|-------------------------------|
| `'rust'`     | highlight.js `rust`   | `.rs`                         |
| `'toml'`     | highlight.js `ini`    | `Cargo.toml`, other `.toml`   |
| `'shell'`    | highlight.js `bash`   | `.sh`, deploy scripts         |
| `'json'`     | highlight.js `json`   | `.json`                       |
| `'markdown'` | highlight.js `markdown` | `.md`, `README`             |
| `'plaintext'`| none (tokenizer bypassed) | anything else             |

The set is deliberate, not an oversight. It covers the file kinds OpenZeppelin's Stellar
code generation emits; the kit does not ship a general-purpose highlighter. Passing a
value outside the union is a TypeScript error. Wanting a language that is not listed is
not an error case: pass `'plaintext'` and the source renders unstyled. (TOML has no
highlight.js grammar of its own; the `ini` grammar is the standard stand-in and handles
tables, keys, strings, and comments.)

**You pick the language; the component never infers it.** There is no filename or
content detection. Map file extensions to `CodeViewLanguage` in your application, where
you know the file's provenance.

**Standard `hljs-*` classes, kit-token colors.** Token spans carry the same class names
highlight.js emits (`hljs-keyword`, `hljs-string`, `hljs-comment`, …) and the `<code>`
element carries the standard `hljs` class. The default colors map those classes to the
kit's design tokens (`--primary`, `--muted-foreground`, `--success`, …) so the pane
matches the rest of your UI and follows your color mode with no stylesheet import and no
global CSS side effect. Because the class names are standard, you *can* apply a
highlight.js theme of your own; see [Theming](./integration-guide.md#pattern-3-apply-a-highlightjs-theme).
Compatibility with the highlight.js class contract is what is promised. Pixel parity
with any particular product's code styling is not.

**Fail to source, never to blank.** If tokenization throws for any reason, the pane
renders the original text as plain text. It never shows an empty region, an error
state, a spinner, or injected HTML. Showing the exact source is the component's first
duty; coloring it is second.

**Decoration is optional, and presentational only.** `decorateToken` is a callback the
pane invokes once for every run of text it is about to render. You get the text, its
offset in `source`, and the `hljs-*` class of the span it sits in (if any); you return
either nothing, to keep the default, or a React node that replaces that run's default
rendering: typically the same characters with a substring wrapped in `<a>` or `<mark>`.
Omit the prop and the output is identical to a pane that never had the feature.
Decoration can change *how* text is shown, never *what* text is shown: the pane's
worth rests on displaying exactly what the user will download, and the seam is built
and tested so that it cannot become the hole in that guarantee. The callback matches
**text, not token types**: the interesting content (a path segment, an identifier, a
name inside a string) usually sits in text the highlighter leaves unclassified, so
that is what you are handed. A throwing decorator costs you one undecorated run, not
the pane. The kit ships no built-in decorations; it provides the hook and you provide
the meaning. See [Pattern 4](./integration-guide.md#pattern-4-decorate-tokens).

## API Reference

See [api-reference.md](./api-reference.md) for `CodeView`, `CodeViewProps`,
`CodeViewLanguage`, and the decoration types `CodeViewTokenDecorator`,
`CodeViewDecorationContext`, and `CodeViewToken`.

## Integration Guide

See [integration-guide.md](./integration-guide.md) for mapping filenames to languages,
sizing the pane inside a layout, applying a custom theme, decorating tokens with links
or marks, and common mistakes.

## Safety

- **Import path.** Only `@openzeppelin/ui-components/code-view`. The main entry does
  not, and will not, export `CodeView`.
- **Read-only.** `CodeView` holds no state and has no `onChange`. Source and language
  are controlled props; changing them replaces the displayed document synchronously.
- **No HTML injection path.** Source is rendered as React text nodes; there is no
  `dangerouslySetInnerHTML` and no HTML string parsing. `<script>` inside `source`
  displays as the characters `<script>`.
- **Exact text.** Whitespace, indentation, line breaks, and trailing newlines are
  preserved byte-for-byte in the rendered text. No trimming, no line splitting.
- **Decoration cannot alter text.** `decorateToken` replaces how one run of text is
  rendered; the run's characters are handed to you and every leaf is still visited in
  source order, so the kit's side of the contract keeps `code.textContent === source`.
  The tests assert byte-identical text with active decorators. Your side of the
  contract is to return the characters you were given, and only those (see
  [Pattern 4](./integration-guide.md#pattern-4-decorate-tokens)).
- **Decoration fails soft.** If your callback throws for a run of text, that run
  renders with the default highlighting and the rest of the pane is unaffected. No
  error reaches React, no error boundary trips, and no text is dropped.
- **Decoration is domain-free.** The kit has no built-in mappings, link types, URL
  templates, or convenience overloads. It never invents an `href`. Anything a link
  points to is your decision, made in your code.
- **Synchronous.** Highlighting runs in the render, memoized on `source` and `language`.
  Re-rendering with a different `className` or `aria-label`, or flipping color mode,
  does not re-tokenize. The kit's largest known generated file (~31 kB, ~770 lines of
  shell) highlights in well under the 50 ms tokenizer budget; there is no size cutoff
  at which highlighting turns off.
- **Accessibility.** The `<pre>` is the focusable, scrolling region (`tabIndex={0}`),
  carries the accessible name (`aria-label`, default `"Source code"`), and shows a
  visible focus ring. Token spans have no roles, labels, or tab stops. The component
  has no `aria-live`, so updating `source` on every keystroke of a form does not cause
  a screen reader to re-announce the document.
- **Styling prerequisite.** Like every component in this package, `CodeView` is styled
  with Tailwind utility classes and expects the consuming app's Tailwind build to scan
  `@openzeppelin/ui-components` (see the package README's *Styling* section). Without
  that scan, the token colors and the focus ring are omitted from your CSS; the text
  and structure still render correctly.

## License

Same as `@openzeppelin/ui-components` (see repository `LICENSE`).
