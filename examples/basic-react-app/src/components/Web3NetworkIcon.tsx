import { networkIcons, type IconComponent, type IconComponentProps } from '@web3icons/react';
import type { ReactElement } from 'react';

export interface Web3NetworkIconProps extends IconComponentProps {
  network: string;
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join('');
}

function getNetworkIconComponent(network: string): IconComponent | null {
  const exportName = `Network${toPascalCase(network)}`;

  return (networkIcons as Record<string, IconComponent | undefined>)[exportName] ?? null;
}

export function Web3NetworkIcon({
  network,
  fallback,
  ...props
}: Web3NetworkIconProps): ReactElement | null {
  const Icon = getNetworkIconComponent(network);

  if (!Icon) {
    return null;
  }

  return <Icon fallback={fallback ?? network[0]?.toUpperCase() ?? '?'} {...props} />;
}
