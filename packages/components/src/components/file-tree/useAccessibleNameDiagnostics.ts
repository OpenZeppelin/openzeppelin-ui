import { useEffect, useRef } from 'react';

import { logger } from '@openzeppelin/ui-utils';

const IS_DEV = process.env.NODE_ENV !== 'production';

const DIAGNOSTIC_SYSTEM = 'FileTree';

function reportAccessibleNameIssue(message: string): void {
  // Intentional dev-only diagnostic; production never calls this helper.
  logger.error(DIAGNOSTIC_SYSTEM, message);
}

/**
 * Development-only accessible-name diagnostics. Production mounts without throwing.
 */
export function useAccessibleNameDiagnostics(props: {
  'aria-label'?: string;
  'aria-labelledby'?: string;
}): void {
  const { 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy } = props;
  const reportedBlankRef = useRef(false);
  const reportedMissingTargetRef = useRef(false);

  useEffect(() => {
    if (!IS_DEV) {
      return;
    }

    const hasLabel = typeof ariaLabel === 'string' && ariaLabel.trim().length > 0;
    const hasLabelledBy = typeof ariaLabelledBy === 'string' && ariaLabelledBy.trim().length > 0;

    if (!hasLabel && !hasLabelledBy && !reportedBlankRef.current) {
      reportedBlankRef.current = true;
      reportAccessibleNameIssue(
        'Accessible name required: provide a nonblank aria-label or aria-labelledby.'
      );
    }
  }, [ariaLabel, ariaLabelledBy]);

  useEffect(() => {
    if (!IS_DEV) {
      return;
    }

    const labelledBy = ariaLabelledBy?.trim();
    if (labelledBy == null || labelledBy.length === 0) {
      return;
    }

    if (document.getElementById(labelledBy) == null && !reportedMissingTargetRef.current) {
      reportedMissingTargetRef.current = true;
      reportAccessibleNameIssue(
        `aria-labelledby="${labelledBy}" does not match any element in the document.`
      );
    }
  }, [ariaLabelledBy]);
}
