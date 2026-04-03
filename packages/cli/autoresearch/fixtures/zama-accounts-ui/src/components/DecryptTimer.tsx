import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface DecryptTimerProps {
  active: boolean;
  retryStatus?: string | null;
}

/**
 * Shows elapsed time and context note during Zama relayer decryption waits.
 * Never show a raw spinner — users need to know decryption runs on a separate chain.
 */
export default function DecryptTimer({ active, retryStatus }: DecryptTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    startRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Decrypting...</span>
            <span className="text-xs font-mono text-muted-foreground">{elapsed}s</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Decryption runs on a separate chain (Zama Gateway). This typically takes 60-90 seconds on testnet.
      </p>
      {retryStatus && (
        <p className="text-xs text-yellow-600">{retryStatus}</p>
      )}
    </div>
  );
}
