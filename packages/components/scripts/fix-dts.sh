#!/bin/bash
# Fix tsdown/rolldown-plugin-dts declaration file naming
# See: https://github.com/rolldown/tsdown/issues/683

cd dist

# Fix index declaration files
for f in index-*.d.ts; do
  [ -f "$f" ] && cp "$f" index.d.ts
done
for f in index-*.d.cts; do
  [ -f "$f" ] && cp "$f" index.d.cts
done

# Fix code-editor declaration files
for f in code-editor-*.d.ts; do
  [ -f "$f" ] && cp "$f" code-editor.d.ts
done
for f in code-editor-*.d.cts; do
  [ -f "$f" ] && cp "$f" code-editor.d.cts
done

exit 0
