/**
 * Maps standard highlight.js token classes to kit tokens without importing a theme stylesheet.
 */
export const CODE_VIEW_TOKEN_STYLE_CLASSES = [
  '[&_.hljs-comment]:text-muted-foreground',
  '[&_.hljs-quote]:text-muted-foreground',
  '[&_.hljs-keyword]:text-primary',
  '[&_.hljs-selector-tag]:text-primary',
  '[&_.hljs-built_in]:text-info',
  '[&_.hljs-type]:text-info',
  '[&_.hljs-string]:text-success',
  '[&_.hljs-regexp]:text-success',
  '[&_.hljs-number]:text-warning',
  '[&_.hljs-literal]:text-warning',
  '[&_.hljs-title]:text-foreground',
  '[&_.hljs-title.function_]:text-foreground',
  '[&_.hljs-title.class_]:text-foreground',
  '[&_.hljs-function]:text-foreground',
  '[&_.hljs-variable]:text-foreground',
  '[&_.hljs-attr]:text-chart-2',
  '[&_.hljs-attribute]:text-chart-2',
  '[&_.hljs-name]:text-chart-3',
  '[&_.hljs-tag]:text-chart-3',
  '[&_.hljs-meta]:text-muted-foreground',
  '[&_.hljs-symbol]:text-destructive',
  '[&_.hljs-bullet]:text-muted-foreground',
  '[&_.hljs-section]:text-primary',
  '[&_.hljs-params]:text-foreground',
  '[&_.hljs-property]:text-chart-4',
  '[&_.hljs-punctuation]:text-muted-foreground',
].join(' ');

/**
 * Kit-token paint for `<mark>` inside `.hljs`. Applied only when a reveal range
 * resolved, so omitting `reveal` keeps the same class list as a pane without one.
 */
export const CODE_VIEW_REVEAL_MARK_STYLE_CLASSES = [
  '[&_mark]:bg-selected/15',
  '[&_mark]:text-inherit',
].join(' ');
