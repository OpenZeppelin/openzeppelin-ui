import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { Button, Progress } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates Progress component for displaying task completion status.
 * Shows static progress, animated progress, and blockchain-specific use cases.
 */
export function ProgressDemo(): ReactElement {
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Simulate progress animation
  useEffect(() => {
    if (isAnimating && progress < 100) {
      const timer = setTimeout(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 15, 100));
      }, 500);
      return () => clearTimeout(timer);
    }
    if (progress >= 100) {
      setIsAnimating(false);
    }
  }, [isAnimating, progress]);

  const startProgress = () => {
    setProgress(0);
    setIsAnimating(true);
  };

  const resetProgress = () => {
    setProgress(0);
    setIsAnimating(false);
  };

  return (
    <DemoSection
      title="Progress"
      description="A progress indicator component that displays the completion status of a task or operation. Built on Radix UI Progress primitive."
      codeExample={`import { Progress } from '@openzeppelin/ui-components';

// Basic progress bar
<Progress value={33} />

// Full progress
<Progress value={100} />

// Dynamic progress
const [progress, setProgress] = useState(0);

<Progress value={progress} />
<button onClick={() => setProgress(prev => prev + 10)}>
  Increase
</button>

// With percentage label
<div className="space-y-2">
  <Progress value={66} />
  <p className="text-sm text-muted-foreground">66% complete</p>
</div>`}
    >
      {/* Basic Progress */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Progress</h3>
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">0%</span>
            </div>
            <Progress value={0} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">25%</span>
            </div>
            <Progress value={25} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">50%</span>
            </div>
            <Progress value={50} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">75%</span>
            </div>
            <Progress value={75} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">100%</span>
            </div>
            <Progress value={100} />
          </div>
        </div>
      </div>

      {/* Interactive Progress */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Interactive Progress</h3>
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
          <div className="flex gap-2">
            <Button onClick={startProgress} disabled={isAnimating}>
              {isAnimating ? 'Simulating...' : 'Start Simulation'}
            </Button>
            <Button variant="outline" onClick={resetProgress}>
              Reset
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            Click &quot;Start Simulation&quot; to see an animated progress bar.
          </p>
        </div>
      </div>

      {/* Progress with Labels */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Labels</h3>
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Storage Used</span>
              <span className="text-muted-foreground">2.5 GB / 10 GB</span>
            </div>
            <Progress value={25} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>API Calls</span>
              <span className="text-muted-foreground">7,500 / 10,000</span>
            </div>
            <Progress value={75} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Daily Limit</span>
              <span className="text-muted-foreground">45 / 50 transactions</span>
            </div>
            <Progress value={90} />
          </div>
        </div>
      </div>

      {/* Blockchain Use Cases */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Blockchain Use Cases</h3>
        <div className="w-full max-w-md space-y-6">
          {/* Transaction Confirmations */}
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Transaction Confirmations</span>
              <span className="text-muted-foreground">8 / 12</span>
            </div>
            <Progress value={67} />
            <p className="text-muted-foreground text-xs">
              Waiting for 4 more confirmations to consider finalized.
            </p>
          </div>

          {/* Block Sync Progress */}
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Block Sync Progress</span>
              <span className="text-muted-foreground">Block 18,542,100 / 18,542,301</span>
            </div>
            <Progress value={99.99} />
            <p className="text-muted-foreground text-xs">
              Node is syncing with the network. 201 blocks remaining.
            </p>
          </div>

          {/* Token Distribution */}
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Token Sale Progress</span>
              <span className="text-muted-foreground">750,000 / 1,000,000 MTK</span>
            </div>
            <Progress value={75} />
            <p className="text-muted-foreground text-xs">
              75% of tokens sold. 250,000 MTK remaining.
            </p>
          </div>

          {/* Staking Lock Period */}
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Staking Lock Period</span>
              <span className="text-muted-foreground">21 / 28 days</span>
            </div>
            <Progress value={75} />
            <p className="text-muted-foreground text-xs">
              7 days remaining until tokens can be withdrawn.
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Step Progress */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Multi-Step Transaction</h3>
        <div className="w-full max-w-md space-y-4 rounded-lg border p-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-xs text-white">
                    ✓
                  </span>
                  Approve Token
                </span>
                <span className="text-green-600">Complete</span>
              </div>
              <Progress value={100} className="h-1" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-xs text-white">
                    ✓
                  </span>
                  Sign Transaction
                </span>
                <span className="text-green-600">Complete</span>
              </div>
              <Progress value={100} className="h-1" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="bg-primary flex h-5 w-5 animate-pulse items-center justify-center rounded-full text-xs text-white">
                    3
                  </span>
                  Confirming
                </span>
                <span className="text-muted-foreground">In Progress</span>
              </div>
              <Progress value={60} className="h-1" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <span className="bg-muted flex h-5 w-5 items-center justify-center rounded-full text-xs">
                    4
                  </span>
                  Finalize
                </span>
                <span className="text-muted-foreground">Pending</span>
              </div>
              <Progress value={0} className="h-1" />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Overall progress: 65% complete. Estimated time: ~30 seconds.
          </p>
        </div>
      </div>

      {/* Size Variations */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Size Variations</h3>
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-2">
            <span className="text-sm">Thin (h-1)</span>
            <Progress value={60} className="h-1" />
          </div>
          <div className="space-y-2">
            <span className="text-sm">Default (h-2)</span>
            <Progress value={60} />
          </div>
          <div className="space-y-2">
            <span className="text-sm">Medium (h-3)</span>
            <Progress value={60} className="h-3" />
          </div>
          <div className="space-y-2">
            <span className="text-sm">Large (h-4)</span>
            <Progress value={60} className="h-4" />
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
