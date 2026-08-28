/**
 * CodeView entry point.
 *
 * Exported separately so consumers that do not import this subpath never bundle
 * the syntax highlighter or its tokenizer dependencies.
 *
 * Usage:
 * ```typescript
 * import { CodeView, type CodeViewLanguage } from '@openzeppelin/ui-components/code-view';
 * ```
 */
export {
  CodeView,
  type CodeViewDecorationContext,
  type CodeViewLanguage,
  type CodeViewProps,
  type CodeViewToken,
  type CodeViewTokenDecorator,
} from './components/ui/code-view/CodeView';
// The language list and its guard live with the type rather than with the
// component, so a consumer can narrow a language id without importing the
// component file.
export { CODE_VIEW_LANGUAGES, isCodeViewLanguage } from './components/ui/code-view/types';
