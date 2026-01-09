import { Check, Send, Wallet } from 'lucide-react';
import { useState } from 'react';

import { LoadingButton } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates LoadingButton component with loading states for async operations
 */
export function LoadingButtonDemo(): React.ReactElement {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [completedStates, setCompletedStates] = useState<Record<string, boolean>>({});

  const simulateAsync = (id: string, duration: number = 2000) => {
    setLoadingStates((prev) => ({ ...prev, [id]: true }));
    setCompletedStates((prev) => ({ ...prev, [id]: false }));

    setTimeout(() => {
      setLoadingStates((prev) => ({ ...prev, [id]: false }));
      setCompletedStates((prev) => ({ ...prev, [id]: true }));

      // Reset completed state after showing success
      setTimeout(() => {
        setCompletedStates((prev) => ({ ...prev, [id]: false }));
      }, 2000);
    }, duration);
  };

  return (
    <DemoSection
      title="LoadingButton"
      description="A button component that displays a loading spinner during async operations. Automatically disables the button while loading to prevent duplicate submissions."
      codeExample={`import { LoadingButton } from '@openzeppelin/ui-components';

// Basic usage
<LoadingButton loading={isLoading} onClick={handleClick}>
  Submit
</LoadingButton>

// With variants
<LoadingButton
  variant="destructive"
  loading={isDeleting}
  onClick={handleDelete}
>
  Delete
</LoadingButton>

// Controlled loading state
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  await submitForm();
  setLoading(false);
};

<LoadingButton loading={loading} onClick={handleSubmit}>
  Save Changes
</LoadingButton>`}
    >
      {/* Basic Usage */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic</h3>
        <div className="flex flex-wrap gap-4">
          <LoadingButton loading={loadingStates['basic']} onClick={() => simulateAsync('basic')}>
            {completedStates['basic'] ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Done!
              </>
            ) : (
              'Click to Load'
            )}
          </LoadingButton>
        </div>
      </div>

      {/* Variants */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Variants</h3>
        <div className="flex flex-wrap gap-4">
          <LoadingButton
            variant="default"
            loading={loadingStates['default']}
            onClick={() => simulateAsync('default')}
          >
            Default
          </LoadingButton>
          <LoadingButton
            variant="secondary"
            loading={loadingStates['secondary']}
            onClick={() => simulateAsync('secondary')}
          >
            Secondary
          </LoadingButton>
          <LoadingButton
            variant="destructive"
            loading={loadingStates['destructive']}
            onClick={() => simulateAsync('destructive')}
          >
            Destructive
          </LoadingButton>
          <LoadingButton
            variant="outline"
            loading={loadingStates['outline']}
            onClick={() => simulateAsync('outline')}
          >
            Outline
          </LoadingButton>
          <LoadingButton
            variant="ghost"
            loading={loadingStates['ghost']}
            onClick={() => simulateAsync('ghost')}
          >
            Ghost
          </LoadingButton>
        </div>
      </div>

      {/* Sizes */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Sizes</h3>
        <div className="flex flex-wrap items-center gap-4">
          <LoadingButton
            size="sm"
            loading={loadingStates['sm']}
            onClick={() => simulateAsync('sm')}
          >
            Small
          </LoadingButton>
          <LoadingButton
            size="default"
            loading={loadingStates['md']}
            onClick={() => simulateAsync('md')}
          >
            Default
          </LoadingButton>
          <LoadingButton
            size="lg"
            loading={loadingStates['lg']}
            onClick={() => simulateAsync('lg')}
          >
            Large
          </LoadingButton>
        </div>
      </div>

      {/* Loading State Demonstration */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Loading State</h3>
        <p className="text-muted-foreground text-sm">
          Compare loading vs non-loading states side by side:
        </p>
        <div className="flex flex-wrap gap-4">
          <LoadingButton loading={false}>Not Loading</LoadingButton>
          <LoadingButton loading={true}>Loading...</LoadingButton>
          <LoadingButton loading={true} variant="secondary">
            Processing
          </LoadingButton>
          <LoadingButton loading={true} variant="outline">
            Please wait
          </LoadingButton>
        </div>
      </div>

      {/* Disabled vs Loading */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Disabled vs Loading</h3>
        <div className="flex flex-wrap gap-4">
          <LoadingButton disabled>Disabled</LoadingButton>
          <LoadingButton loading={true}>Loading</LoadingButton>
          <LoadingButton disabled loading={true}>
            Both (loading wins)
          </LoadingButton>
        </div>
      </div>

      {/* Blockchain Use Cases */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Blockchain Use Cases</h3>
        <div className="flex flex-wrap gap-4">
          <LoadingButton
            loading={loadingStates['connect']}
            onClick={() => simulateAsync('connect', 1500)}
          >
            <Wallet className="mr-2 h-4 w-4" />
            {completedStates['connect'] ? 'Connected!' : 'Connect Wallet'}
          </LoadingButton>

          <LoadingButton
            loading={loadingStates['send']}
            onClick={() => simulateAsync('send', 3000)}
          >
            <Send className="mr-2 h-4 w-4" />
            {loadingStates['send']
              ? 'Confirming...'
              : completedStates['send']
                ? 'Sent!'
                : 'Send Transaction'}
          </LoadingButton>

          <LoadingButton
            variant="secondary"
            loading={loadingStates['approve']}
            onClick={() => simulateAsync('approve', 2500)}
          >
            {loadingStates['approve']
              ? 'Approving...'
              : completedStates['approve']
                ? 'Approved!'
                : 'Approve Token'}
          </LoadingButton>
        </div>
      </div>

      {/* In Form Context */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">In Form Context</h3>
        <div className="max-w-md rounded-lg border p-4">
          <h4 className="mb-4 font-medium">Transfer Tokens</h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Address</label>
              <input
                type="text"
                placeholder="0x..."
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <input
                type="text"
                placeholder="0.0"
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <LoadingButton
              className="w-full"
              loading={loadingStates['form-submit']}
              onClick={() => simulateAsync('form-submit', 2000)}
            >
              {loadingStates['form-submit']
                ? 'Processing Transaction...'
                : completedStates['form-submit']
                  ? 'Transaction Sent!'
                  : 'Send Tokens'}
            </LoadingButton>
          </div>
        </div>
      </div>

      {/* Action Group */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Action Group</h3>
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Manage Role</h4>
              <p className="text-muted-foreground text-sm">MINTER_ROLE for 0x742d...1D3F4</p>
            </div>
            <div className="flex gap-2">
              <LoadingButton
                variant="outline"
                size="sm"
                loading={loadingStates['revoke']}
                onClick={() => simulateAsync('revoke', 2000)}
              >
                {completedStates['revoke'] ? 'Revoked!' : 'Revoke'}
              </LoadingButton>
              <LoadingButton
                size="sm"
                loading={loadingStates['grant']}
                onClick={() => simulateAsync('grant', 2000)}
              >
                {completedStates['grant'] ? 'Granted!' : 'Grant'}
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
