import { Info } from 'lucide-react';
import type React from 'react';

import {
  getHostedNetworkAvailabilityNoticeCopy,
  isNetworkAvailabilityPolicyActive,
} from '@openzeppelin/ui-utils';

import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export interface NetworkAvailabilityNoticeProps {
  /** Display name of the hosting app, e.g. "UI Builder" */
  appName: string;
  /** GitHub repository URL for self-hosting instructions */
  selfHostRepoUrl: string;
  className?: string;
}

/**
 * Banner shown when the deployment disables mainnet or specific network IDs.
 * Hidden when no network availability policy is active.
 */
export function NetworkAvailabilityNotice({
  appName,
  selfHostRepoUrl,
  className,
}: NetworkAvailabilityNoticeProps): React.ReactElement | null {
  if (!isNetworkAvailabilityPolicyActive()) {
    return null;
  }

  const { title, descriptionBeforeLink, descriptionLinkLabel } =
    getHostedNetworkAvailabilityNoticeCopy(appName);

  return (
    <Alert className={className}>
      <Info className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {descriptionBeforeLink}
        <a
          href={selfHostRepoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-4 hover:text-foreground"
        >
          {descriptionLinkLabel}
        </a>
        .
      </AlertDescription>
    </Alert>
  );
}
