import { useTheme } from 'next-themes';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

export type CodeLanguage =
  | 'typescript'
  | 'tsx'
  | 'javascript'
  | 'jsx'
  | 'json'
  | 'bash'
  | 'shell'
  | 'solidity'
  | 'yaml'
  | 'markdown';

interface CodeBlockProps {
  /** The code string to highlight */
  code: string;
  /** Programming language for syntax highlighting */
  language?: CodeLanguage;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Reusable code block component with syntax highlighting.
 * Automatically adapts to light/dark theme.
 */
export function CodeBlock({
  code,
  language = 'typescript',
  showLineNumbers = false,
  className = '',
}: CodeBlockProps): React.ReactElement {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <SyntaxHighlighter
      language={language}
      style={isDark ? oneDark : oneLight}
      showLineNumbers={showLineNumbers}
      customStyle={{
        margin: 0,
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
        lineHeight: '1.5',
      }}
      codeTagProps={{
        style: {
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        },
      }}
      className={className}
    >
      {code.trim()}
    </SyntaxHighlighter>
  );
}

/**
 * Inline code component for use within paragraphs.
 * Uses simple styling without syntax highlighting.
 */
export function InlineCode({ children }: { children: React.ReactNode }): React.ReactElement {
  return <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">{children}</code>;
}
