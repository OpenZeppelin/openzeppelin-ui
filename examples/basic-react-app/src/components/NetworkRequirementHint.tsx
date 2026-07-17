import { TriangleAlert } from 'lucide-react';

import { useEcosystem } from '../context';

/**
 * Amber banner shown inside a demo surface whenever the app-wide active network
 * is not the one that surface needs — nudging the user to the header network
 * selector instead of leaving a silent failure (a not-found name, a 404 on a
 * contract deployed elsewhere, ...).
 *
 * Renders nothing when already on the required network (or while it is unknown),
 * so it self-dismisses once the user follows the guidance. The message is passed
 * as children so callers phrase the specific consequence.
 */
export function NetworkRequirementHint({
  requiredNetworkId,
  className = '',
  children,
}: {
  /** Network id the surface needs; `null`/`undefined` renders nothing. */
  requiredNetworkId: string | null | undefined;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement | null {
  const { network } = useEcosystem();

  if (!requiredNetworkId || network?.id === requiredNetworkId) {
    return null;
  }

  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300 ${className}`.trim()}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
