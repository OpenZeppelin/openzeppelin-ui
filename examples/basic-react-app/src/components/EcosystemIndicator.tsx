import { useEcosystem } from '../context';

interface EcosystemIndicatorProps {
  /** Optional description text shown below the ecosystem name */
  description?: string;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Displays the active ecosystem with an optional description.
 * Used across demo components to indicate ecosystem-specific behavior.
 */
export function EcosystemIndicator({
  description,
  className = '',
}: EcosystemIndicatorProps): React.ReactElement {
  const { metadata, isLoading } = useEcosystem();

  if (isLoading || !metadata) {
    return (
      <div className={`bg-muted/50 rounded-lg p-3 ${className}`.trim()}>
        <p className="text-muted-foreground text-sm">Loading ecosystem...</p>
      </div>
    );
  }

  return (
    <div className={`bg-muted/50 rounded-lg p-3 ${className}`.trim()}>
      <p className="text-sm">
        Active ecosystem: <span className="text-primary font-medium">{metadata.name}</span>
      </p>
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
  );
}
