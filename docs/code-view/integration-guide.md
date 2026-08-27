# CodeView — Integration Guide

Four patterns cover the ways teams use `CodeView`, followed by the mistakes we expect
people to make and how to avoid them. Every snippet imports from the subpath and
type-checks against the current `CodeViewProps`.

- [Pattern 1: Show one generated file](#pattern-1-show-one-generated-file)
- [Pattern 2: Map filenames to languages](#pattern-2-map-filenames-to-languages)
- [Pattern 3: Apply a highlight.js theme](#pattern-3-apply-a-highlightjs-theme)
- [Pattern 4: Decorate tokens](#pattern-4-decorate-tokens)
- [Large files](#large-files)
- [Common mistakes](#common-mistakes)

## Pattern 1: Show one generated file

The minimal case: you have a string and you know what it is.

```tsx
import { CodeView } from '@openzeppelin/ui-components/code-view';

export function DeployScriptPreview({ script }: { script: string }) {
  return (
    <CodeView
      source={script}
      language="shell"
      aria-label="deploy.sh source code"
      className="h-full"
    />
  );
}
```

`className` sizes the `<pre>`, which is also the scroll container. Give it a height (or
put it in a flex/grid cell that constrains height) and long files scroll inside the pane
instead of growing the page. Without a height constraint the pane grows to fit its
content, which is fine for short snippets and wrong for a 700-line script in a drawer.

When `script` changes, the pane replaces its content synchronously. A user who has focus
in a form field elsewhere on the page keeps it; `CodeView` never moves focus.

## Pattern 2: Map filenames to languages

`CodeView` does not look at filenames. Do the mapping in your application, where you know
what the files are, and fall back to `'plaintext'` for everything else.

```ts
import type { CodeViewLanguage } from '@openzeppelin/ui-components/code-view';

const LANGUAGE_BY_EXTENSION: Readonly<Record<string, CodeViewLanguage>> = {
  rs: 'rust',
  toml: 'toml',
  sh: 'shell',
  json: 'json',
  md: 'markdown',
};

export function languageForPath(path: string): CodeViewLanguage {
  const dot = path.lastIndexOf('.');
  const ext = dot === -1 ? '' : path.slice(dot + 1).toLowerCase();
  return LANGUAGE_BY_EXTENSION[ext] ?? 'plaintext';
}
```

Then drive the pane from a selected file:

```tsx
import { CodeView } from '@openzeppelin/ui-components/code-view';

interface GeneratedFile {
  path: string;
  contents: string;
}

export function FilePreview({ file }: { file: GeneratedFile }) {
  return (
    <CodeView
      source={file.contents}
      language={languageForPath(file.path)}
      aria-label={`${file.path} source code`}
      className="h-[60vh]"
    />
  );
}
```

Because `CodeViewLanguage` is a closed union, typing the map as
`Record<string, CodeViewLanguage>` means a typo like `'bash'` or `'rs'` on the value side
fails to compile. Extensions you do not list, and files with no extension (`LICENSE`,
`Makefile`), render as plain text. That is the intended path for unsupported kinds, not a
gap to work around.

## Pattern 3: Apply a highlight.js theme

By default the pane colors tokens with kit design tokens, so it matches the rest of a kit
UI and follows light/dark mode with nothing imported. Most consumers should stop there.

If you need a specific highlight.js theme (say, to match code blocks elsewhere in your
product), you can, because the emitted class names are the standard `hljs-*` set. Two
things to know first:

1. **The kit's defaults are already applied, at a specificity of two classes.** Each
   default is a descendant rule from the `<code>` element, so it compiles to roughly
   `.\[…\] .hljs-keyword` (specificity 0,2,0). A stock theme's bare `.hljs-keyword`
   rule (0,1,0) loses to it. Scope your theme so its rules outrank the defaults.
2. **Scope the theme to your pane.** Don't load a global highlight.js theme
   stylesheet expecting it to take over; scope it under a class you pass through
   `className`, so it affects only the panes you intend.

```tsx
<CodeView source={source} language="rust" className="my-code-theme h-96" />
```

```css
/* Three class selectors (0,3,0) outrank the kit defaults (0,2,0). */
.my-code-theme .hljs .hljs-keyword  { color: #c678dd; }
.my-code-theme .hljs .hljs-string   { color: #98c379; }
.my-code-theme .hljs .hljs-comment  { color: #5c6370; font-style: italic; }
.my-code-theme .hljs .hljs-number   { color: #d19a66; }
/* …and so on for the classes your theme cares about. */
```

To adapt an existing highlight.js theme file, prefix every `.hljs-*` rule with
`.my-code-theme .hljs ` (or wrap the file in a nested `.my-code-theme .hljs { … }` block
if your CSS pipeline supports nesting). Theme rules on `.hljs` itself (background, base
text color) apply to the `<code>` element; note the `<pre>` behind it still paints the
kit `bg-background`, so set the pane background through `className` if your theme
expects a different one.

What this gives you is class-name compatibility with the highlight.js ecosystem. It does
not promise that a given theme will look identical here and in another product, because
nesting, font stack, padding, and background are kit-owned.

## Pattern 4: Decorate tokens

`decorateToken` lets you wrap parts of the highlighted text in your own elements. The
two uses we expect: turning names the reader might want to follow into links, and
marking occurrences of something (a search term, a changed identifier). Both keep the
text exactly as it is and change only what surrounds it.

Before the code, the model. The highlighter turns `source` into a flat sequence of text
runs, each either inside a `hljs-*` span or not. `CodeView` calls your function once per
run, in order, with the run's `text`, its `offset` into `source`, and the enclosing
span's `className` if there is one. You return `undefined` to keep the default, or a
React node containing the same characters to replace it. That is the whole seam.

### Mark every occurrence of a term

A run may contain the term more than once, or at either end, so split the run around
each match and rebuild it as a fragment. The pieces concatenate back to `token.text`,
which is the property that keeps the pane's text identical to `source`.

```tsx
import React, { useCallback } from 'react';
import { CodeView, type CodeViewTokenDecorator } from '@openzeppelin/ui-components/code-view';

export function SearchablePreview({ source, term }: { source: string; term: string }) {
  const decorateToken = useCallback<CodeViewTokenDecorator>(
    ({ token }) => {
      if (term === '' || !token.text.includes(term)) return undefined;

      const parts = token.text.split(term);
      return (
        <>
          {parts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && <mark>{term}</mark>}
              {part}
            </React.Fragment>
          ))}
        </>
      );
    },
    [term]
  );

  return (
    <CodeView source={source} language="rust" decorateToken={decorateToken} className="h-96" />
  );
}
```

`split` followed by re-joining with `<mark>{term}</mark>` between the parts yields exactly
the original characters: no run is lengthened, shortened, or reordered. When `term`
changes, the callback identity changes and the pane re-renders the decorations; it does
not re-tokenize `source`, because tokenization is memoized on `source` and `language`
only.

### Link names to a destination you choose

The kit knows nothing about what a name means or where it should point. You bring the
map. Here `docsByName` is any `Record<string, string>` your application owns.

```tsx
import React, { useCallback } from 'react';
import { CodeView, type CodeViewTokenDecorator } from '@openzeppelin/ui-components/code-view';

const NAME = /[A-Za-z_][A-Za-z0-9_]*/g;

export function LinkedPreview({
  source,
  docsByName,
}: {
  source: string;
  docsByName: Readonly<Record<string, string>>;
}) {
  const decorateToken = useCallback<CodeViewTokenDecorator>(
    ({ token, language }) => {
      if (language !== 'rust') return undefined;
      // Only unclassified runs: skip keywords, strings, comments, and everything
      // else the grammar already labelled.
      if (token.className !== undefined) return undefined;

      const nodes: React.ReactNode[] = [];
      let last = 0;
      for (const match of token.text.matchAll(NAME)) {
        const href = docsByName[match[0]];
        if (href === undefined) continue;
        const start = match.index ?? 0;
        nodes.push(token.text.slice(last, start));
        nodes.push(
          <a key={token.offset + start} href={href} target="_blank" rel="noreferrer">
            {match[0]}
          </a>
        );
        last = start + match[0].length;
      }
      if (nodes.length === 0) return undefined;
      nodes.push(token.text.slice(last));
      return <>{nodes}</>;
    },
    [docsByName]
  );

  return (
    <CodeView source={source} language="rust" decorateToken={decorateToken} className="h-96" />
  );
}
```

Three things this example is doing on purpose:

1. **It matches text, not token classes.** Notice that the interesting runs are the ones
   with `className === undefined`. Highlighters classify keywords, strings, comments,
   and a few other categories; they leave connective text (the path in an import
   statement, most identifiers, punctuation, whitespace) unclassified, and that is
   usually where the names you want to link live. A decorator that only looked at
   `hljs-*` spans would never see them. Use `className` to *exclude* runs you should
   not touch (`hljs-string`, `hljs-comment`); find your targets by looking at `text`.
2. **It rebuilds the run from slices of `token.text`.** Prefix, link, suffix (or several
   of each) concatenate to exactly the original characters. Nothing is inserted between
   them and nothing is dropped. If you find yourself wanting to add a character (an
   icon glyph, a trailing arrow), put it in CSS (`::after`) or in an `aria-label`, not
   in the text.
3. **The `href` comes from the consumer.** The kit did not build it, does not validate
   it, and will not supply a fallback if the map has no entry: an unmatched name simply
   stays plain text, because the function returns `undefined`.

The returned `<a>` elements are real links. They are focusable, appear in the tab order
in source position, and will be read by a screen reader as links. That is your design
choice to make; think about link density (a link on every identifier of a 700-line file
is a lot of tab stops) and about `rel` / `target` policy for wherever the links go.

### Where in the file am I?

`token.offset` is an absolute index into `source`, in the same units as
`String.prototype.length`. With it and `context.source` you can recover anything about
the run's surroundings without a second parse:

```ts
import type { CodeViewDecorationContext } from '@openzeppelin/ui-components/code-view';

function lineOf({ source, token }: CodeViewDecorationContext): string {
  const start = source.lastIndexOf('\n', token.offset - 1) + 1;
  const end = source.indexOf('\n', token.offset);
  return source.slice(start, end === -1 ? undefined : end);
}
```

Use this to gate decorations on line shape (only lines that start with a given keyword,
say) rather than trying to reconstruct that from the run alone; a run rarely spans a
whole line.

### What happens when your decorator throws

Each call is wrapped: an exception from your function is caught at that run, the run
renders with its default highlighting, and every other run is unaffected. The pane never
blanks, never falls back to plain text because of a decorator, and never surfaces an
error to an error boundary above it. There is also no signal that it happened. During
development, test your decorator directly rather than relying on the pane to tell you.

### Test your decorator once

The one property the kit cannot check for you is that your returned nodes contain
exactly the run's characters. A single component test covers it:

```tsx
import { render } from '@testing-library/react';
import { CodeView } from '@openzeppelin/ui-components/code-view';

it('keeps the rendered text identical to the source', () => {
  const source = 'use acme_lib::access_control::{Role, Guard};\n';
  const { container } = render(
    <CodeView source={source} language="rust" decorateToken={myDecorator} />
  );
  expect(container.querySelector('code')?.textContent).toBe(source);
});
```

Run it against an input that exercises every branch of your decorator (a run with two
matches, a match at the start, a match at the end). If it passes, the pane is showing
the user exactly the file they will download, with your decorations on top.

## Large files

There is no size cutoff. Highlighting stays on for every input; the kit's own performance
gate is a ~31 kB, ~770-line generated shell script, which tokenizes in well under 50 ms.
That comfortably covers the generated-project use case the component was built for.

Two consequences for very large inputs (hundreds of kB and up):

- Tokenization is synchronous in render. A multi-megabyte file will block the main
  thread for the duration of tokenization. If you need that, tokenize less (show a
  section, or pass `'plaintext'` for files past a threshold you choose).
- The DOM holds one `<span>` per token. Browser find and selection still work, but
  memory scales with token count. `CodeView` does not virtualize lines, on purpose:
  virtualization breaks find, select-all, and copy.

For the common case, do nothing special.

## Common mistakes

- **Importing from the main entry.**
  `import { CodeView } from '@openzeppelin/ui-components'` does not compile; `CodeView`
  is not there. Use `@openzeppelin/ui-components/code-view`. This is deliberate, so
  consumers who never render code never ship the highlighter. It is not a missing
  re-export, and a PR adding one will be declined.

- **Expecting language detection.**
  There is no `language="auto"` and no filename prop. Map extensions yourself
  ([Pattern 2](#pattern-2-map-filenames-to-languages)). Detection was rejected because
  it is slow and nondeterministic on short files, and consumers already know their
  file kinds.

- **Treating an unsupported language as an error.**
  The union has six members for a reason. For `.yaml`, `.ts`, `.sol`, or anything
  else, pass `'plaintext'`. The source renders exactly; only the coloring is absent.

- **Passing `'bash'`, `'sh'`, `'rs'`, or `'ini'`.**
  The public names are `'shell'`, `'rust'`, and `'toml'`. Grammar names are an
  implementation detail; the compiler will tell you.

- **Wrapping the pane in a `<pre>` or `<code>`.**
  `CodeView` renders both. Nesting another produces double borders and double
  monospace scaling.

- **Looking for `onChange`, `value`, or a `ref`.**
  `CodeView` is display-only. For an editable, form-bound field use
  `@openzeppelin/ui-components/code-editor` (`CodeEditorField`), which has a different
  contract and its own size cutoff for highlighting.

- **Trying to theme through `className`.**
  `className` lands on the `<pre>` and is meant for layout. It does not reach token
  spans. Use a scoped stylesheet as in [Pattern 3](#pattern-3-apply-a-highlightjs-theme).

- **Forgetting the Tailwind source scan.**
  If token colors and the focus ring are missing, the consuming app's Tailwind build is
  not scanning `@openzeppelin/ui-components`. Run `oz-ui-dev tailwind doctor` (see the
  package README). The text still renders correctly in the meantime.

- **Adding `aria-live` around the pane.**
  Don't. Source updates on every form keystroke would make a screen reader re-read the
  whole document. Name the region with `aria-label` instead and let users navigate to it.

- **Returning `false`, `''`, or `0` from `decorateToken` to mean "skip".**
  Only `undefined` and `null` keep the default. React renders `false` and `''` as
  nothing, so the run's text disappears from the pane. Return `undefined`.

- **Returning decorated text that is not the run's text.**
  Trimming whitespace, adding a glyph, changing case, or dropping a suffix all break
  `code.textContent === source`, and the pane then shows something the user will not
  find in the downloaded file. Rebuild from slices of `token.text`
  ([Pattern 4](#pattern-4-decorate-tokens)) and assert text identity in a test.

- **Matching on `className` to find content.**
  `hljs-*` classes mark syntax categories (keyword, string, comment), not the things
  you usually want to point at. Paths, identifiers, and connective text are commonly
  unclassified (`className === undefined`). Search `token.text`; use `className` only
  to skip categories you should leave alone.

- **Expecting one call per line, per file, or per "word".**
  The callback runs once per highlighter text run. A run can be a single keyword or a
  long stretch of unclassified text spanning several words; whitespace between tokens
  is its own run. Use `token.offset` with `context.source` when you need line context.

- **Expecting `decorateToken` to run for `'plaintext'`.**
  It does not. Plain text has no highlighter runs, so the callback is never invoked;
  the source renders as one text node. Decoration requires a highlighted language.

- **Looking for built-in link or mark helpers, a URL template prop, or a decorator
  list.**
  There are none, on purpose. The kit provides one callback and three types; what a name
  means and where it links is application knowledge. Compose multiple policies inside
  one function.

- **Relying on the pane to report a broken decorator.**
  A throw is swallowed at the run and rendered as default text; there is no callback,
  log, or dev warning. Test the decorator directly.
