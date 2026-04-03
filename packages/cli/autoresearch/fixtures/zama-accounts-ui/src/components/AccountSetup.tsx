import { useState, useEffect } from 'react';
import { type Address, isAddress } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { useWallet, type SetupStep } from '../hooks/useWallet';
import { SEPOLIA_FAUCETS } from '../config/constants';
import { Lock, Loader2, CheckCircle2, Circle, ArrowLeft, ExternalLink } from 'lucide-react';

const STEP_LABELS: Record<SetupStep, string> = {
  predict: 'Predicting account address...',
  fund: 'Funding account with SepoliaETH...',
  deploy: 'Deploying smart account + FHE delegation...',
  done: 'Account ready!',
};

function StepIndicator({ current, step, label }: { current: SetupStep; step: SetupStep; label: string }) {
  const steps: SetupStep[] = ['predict', 'fund', 'deploy', 'done'];
  const currentIdx = steps.indexOf(current);
  const stepIdx = steps.indexOf(step);
  const isDone = currentIdx > stepIdx;
  const isActive = current === step;

  return (
    <div className="flex items-center gap-3">
      {isDone ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
      ) : isActive ? (
        <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
      )}
      <span className={isDone ? 'text-muted-foreground' : isActive ? 'font-medium' : 'text-muted-foreground/50'}>
        {label}
      </span>
    </div>
  );
}

// Suppress unused variable warning — STEP_LABELS used implicitly
void STEP_LABELS;

export default function AccountSetup() {
  const { createWallet, connectWallet, isCreating, error, setupStep, insufficientBalance } = useWallet();
  const [existingAddress, setExistingAddress] = useState('');
  const [mode, setMode] = useState<'choose' | 'connect'>('choose');
  const [savedAccounts, setSavedAccounts] = useState<Array<{ address: string; createdAt: number }>>([]);

  useEffect(() => {
    const saved: Array<{ address: string; createdAt: number }> = JSON.parse(
      localStorage.getItem('zama-ui-accounts') || '[]',
    );
    setSavedAccounts(saved);
  }, []);

  const handleConnect = async () => {
    if (!isAddress(existingAddress)) return;
    await connectWallet(existingAddress as Address);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <span className="font-semibold">Confidential Accounts</span>
          </div>
          <ConnectButton showBalance={false} accountStatus="avatar" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {isCreating ? 'Creating your account' : 'Set up your smart account'}
            </CardTitle>
            <CardDescription>
              {isCreating
                ? "Deploying your ERC-7579 smart account with FHE decryption delegation. This takes ~15 seconds."
                : 'Your smart account enables encrypted transfers, observer delegation, and session key spending limits.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Insufficient balance — show faucet links */}
            {insufficientBalance && (
              <Alert>
                <AlertDescription>
                  <p className="font-medium mb-2">Get Sepolia ETH from a faucet:</p>
                  <div className="space-y-1">
                    {SEPOLIA_FAUCETS.map((faucet) => (
                      <a
                        key={faucet.name}
                        href={faucet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-primary hover:underline text-sm"
                      >
                        {faucet.name}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {isCreating && setupStep ? (
              <div className="space-y-3 py-2">
                <StepIndicator current={setupStep} step="predict" label="Predict counterfactual address" />
                <StepIndicator current={setupStep} step="fund" label="Fund account with SepoliaETH" />
                <StepIndicator current={setupStep} step="deploy" label="Deploy + set up FHE delegation" />
                <StepIndicator current={setupStep} step="done" label="Account ready" />
              </div>
            ) : mode === 'choose' ? (
              <div className="space-y-3">
                <Button className="w-full h-12 text-base" onClick={createWallet} disabled={isCreating}>
                  Create New Account
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>
                <Button className="w-full" variant="outline" onClick={() => setMode('connect')}>
                  Connect Existing Account
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedAccounts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Previously created accounts:</p>
                    {savedAccounts.map((acc) => (
                      <button
                        key={acc.address}
                        onClick={() => {
                          setExistingAddress(acc.address);
                          connectWallet(acc.address as Address);
                        }}
                        className="w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                        disabled={isCreating}
                      >
                        <span className="font-mono">
                          {acc.address.slice(0, 10)}...{acc.address.slice(-8)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(acc.createdAt).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                    <div className="relative py-1">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-card px-2 text-muted-foreground">or enter address</span>
                      </div>
                    </div>
                  </div>
                )}
                <Input
                  placeholder="0x... smart account address"
                  value={existingAddress}
                  onChange={(e) => setExistingAddress(e.target.value)}
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleConnect} disabled={isCreating || !isAddress(existingAddress)}>
                    Connect
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setMode('choose')} disabled={isCreating}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
