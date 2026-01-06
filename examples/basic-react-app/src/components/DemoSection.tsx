import type { ReactNode } from 'react';

/**
 * Props for the DemoSection wrapper component
 */
interface DemoSectionProps {
  /** Section title displayed as h2 */
  title: string;
  /** Brief description of the component */
  description: string;
  /** Demo content (live examples) */
  children: ReactNode;
  /** Optional code example to display */
  codeExample?: string;
}

/**
 * Reusable wrapper component for consistent demo structure across all component demos.
 * Provides a standardized layout with title, description, demo content, and optional code example.
 */
export function DemoSection({
  title,
  description,
  children,
  codeExample,
}: DemoSectionProps): React.ReactElement {
  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground mb-6">{description}</p>
      </div>

      {children}

      {codeExample && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Usage</h3>
          <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
            <code>{codeExample}</code>
          </pre>
        </div>
      )}
    </section>
  );
}
