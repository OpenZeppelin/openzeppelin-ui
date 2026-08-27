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
