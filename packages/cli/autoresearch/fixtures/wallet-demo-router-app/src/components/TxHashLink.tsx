import type { Hash } from 'viem';

interface TxHashLinkProps {
  hash: Hash;
}

export function TxHashLink({ hash }: TxHashLinkProps) {
  return (
    <a href={`https://sepolia.etherscan.io/tx/${hash}`} rel="noreferrer" target="_blank">
      View transaction
    </a>
  );
}
