import { FileText } from 'lucide-react';
import React from 'react';

export interface EmptyStateProps {
  /**
   * The icon to display.
   * - omitted (`undefined`): the default icon is shown
   * - `null` or `false`: no icon (and no icon container) is rendered
   * - any other node: rendered as the icon
   */
  icon?: React.ReactNode;

  /**
   * Main heading text
   */
  title: string;

  /**
   * Descriptive text explaining the empty state. Nothing is rendered when omitted or empty.
   */
  description?: string;

  /**
   * Optional action area rendered under the text (e.g. a retry button)
   */
  action?: React.ReactNode;

  /**
   * Additional CSS classes for the container
   */
  className?: string;

  /**
   * Size variant for the empty state
   * @default 'default'
   */
  size?: 'small' | 'default' | 'large';
}

/**
 * Reusable empty state component for showing helpful messages when content is not available
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
  size = 'default',
}: EmptyStateProps): React.ReactElement {
  // Default icon using lucide-react
  const defaultIcon = <FileText className="h-6 w-6 text-muted-foreground" />;

  // Size-based styling
  const sizeClasses = {
    small: {
      container: 'py-6',
      iconContainer: 'p-2 mb-2',
      title: 'text-base font-medium mb-1',
      description: 'text-xs max-w-sm',
      action: 'mt-3',
    },
    default: {
      container: 'py-12',
      iconContainer: 'p-3 mb-4',
      title: 'text-lg font-medium mb-2',
      description: 'text-sm max-w-md',
      action: 'mt-4',
    },
    large: {
      container: 'py-16',
      iconContainer: 'p-4 mb-6',
      title: 'text-xl font-medium mb-3',
      description: 'text-base max-w-lg',
      action: 'mt-6',
    },
  };

  const styles = sizeClasses[size];

  // `undefined` means "use the default"; `null`/`false` mean "no icon"
  const showIcon = icon !== null && icon !== false;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${styles.container} ${className}`}
    >
      {showIcon && (
        <div className={`rounded-full bg-muted ${styles.iconContainer}`}>
          {icon === undefined ? defaultIcon : icon}
        </div>
      )}
      <h3 className={`${styles.title}`}>{title}</h3>
      {description ? (
        <p className={`text-muted-foreground ${styles.description}`}>{description}</p>
      ) : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
