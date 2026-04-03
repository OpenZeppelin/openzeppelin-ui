import { useAccount } from 'wagmi';
import { type Address } from 'viem';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface WalletIndicatorProps {
  expectedAddress?: Address;
  expectedRole: string;
  description: string;
}

/**
 * Live wallet indicator banner — reads the connected wallet and compares
 * to the expected address for the current step. Updates reactively on
 * wallet account change.
 */
export default function WalletIndicator({ expectedAddress, expectedRole, description }: WalletIndicatorProps) {
  const { address } = useAccount();

  if (!expectedAddress) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-primary font-medium">{expectedRole}</span>
          <span className="text-muted-foreground">— {description}</span>
        </div>
      </div>
    );
  }

  const isCorrect = address?.toLowerCase() === expectedAddress.toLowerCase();

  return (
    <div className={`rounded-lg border px-4 py-3 ${
      isCorrect
        ? 'border-green-200 bg-green-50'
        : 'border-red-200 bg-red-50'
    }`}>
      <div className="flex items-center gap-2 text-sm">
        {isCorrect ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
        )}
        <div>
          <span className={`font-medium ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
            {isCorrect ? `Correct wallet connected` : `Switch to ${expectedRole} wallet`}
          </span>
          <span className="text-muted-foreground"> — {description}</span>
          {!isCorrect && expectedAddress && (
            <div className="font-mono text-xs mt-1 text-red-700">
              Expected: {expectedAddress.slice(0, 10)}...{expectedAddress.slice(-8)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
