import { type Hash } from 'viem';
import { ExternalLink } from 'lucide-react';

export default function TxHashLink({ hash }: { hash: Hash }) {
  const short = `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  return (
    <a
      href={`https://sepolia.etherscan.io/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs hover:underline"
    >
      {short}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
