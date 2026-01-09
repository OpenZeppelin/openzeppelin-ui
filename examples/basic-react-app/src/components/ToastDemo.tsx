import { AlertCircle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates Toast notifications using Sonner.
 * Shows success, error, info, warning, loading, and custom toast variations.
 */
export function ToastDemo(): React.ReactElement {
  const showBasicToast = () => {
    toast('Event has been created');
  };

  const showSuccessToast = () => {
    toast.success('Transaction confirmed!', {
      description: 'Your transaction has been successfully processed on the blockchain.',
    });
  };

  const showErrorToast = () => {
    toast.error('Transaction failed', {
      description: 'The transaction was reverted. Check your gas settings and try again.',
    });
  };

  const showInfoToast = () => {
    toast.info('Network switch required', {
      description: 'Please switch to Ethereum Mainnet to continue.',
    });
  };

  const showWarningToast = () => {
    toast.warning('Low gas balance', {
      description: 'Your wallet has less than 0.01 ETH. Consider topping up.',
    });
  };

  const showLoadingToast = () => {
    const toastId = toast.loading('Processing transaction...', {
      description: 'Please wait while your transaction is being confirmed.',
    });

    // Simulate async operation
    setTimeout(() => {
      toast.success('Transaction confirmed!', {
        id: toastId,
        description: 'Block: #18,542,321 • Gas used: 21,000',
      });
    }, 3000);
  };

  const showPromiseToast = () => {
    const promise = new Promise((resolve, reject) => {
      setTimeout(() => {
        // Randomly succeed or fail for demo purposes
        if (Math.random() > 0.3) {
          resolve({ txHash: '0xabc...123' });
        } else {
          reject(new Error('Insufficient funds'));
        }
      }, 2000);
    });

    toast.promise(promise, {
      loading: 'Submitting transaction...',
      success: 'Transaction submitted successfully!',
      error: (err) => `Transaction failed: ${err.message}`,
    });
  };

  const showActionToast = () => {
    toast('Contract deployed', {
      description: 'MyToken.sol has been deployed to Sepolia.',
      action: {
        label: 'View',
        onClick: () => window.open('https://sepolia.etherscan.io', '_blank'),
      },
    });
  };

  const showCancelableToast = () => {
    const toastId = toast('Revoking role...', {
      description: 'MINTER_ROLE will be revoked in 5 seconds.',
      duration: 5000,
      cancel: {
        label: 'Undo',
        onClick: () => {
          toast.dismiss(toastId);
          toast.info('Role revocation cancelled');
        },
      },
    });
  };

  const showCustomToast = () => {
    toast.custom((t) => (
      <div className="bg-gray-900 text-white rounded-lg shadow-lg p-4 flex items-start gap-3 w-full max-w-md">
        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium">Wallet Connected</p>
          <p className="text-gray-400 text-sm mt-1">
            Connected to 0x742d...f44e on Ethereum Mainnet
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              onClick={() => toast.dismiss(t)}
            >
              Dismiss
            </Button>
            <Button size="sm" className="h-7 text-xs bg-white text-gray-900 hover:bg-gray-100">
              View Wallet
            </Button>
          </div>
        </div>
      </div>
    ));
  };

  const showPositionedToast = (
    position:
      | 'top-left'
      | 'top-center'
      | 'top-right'
      | 'bottom-left'
      | 'bottom-center'
      | 'bottom-right'
  ) => {
    toast(`Toast at ${position}`, {
      description: 'This toast appears at a specific position.',
      position,
    });
  };

  return (
    <DemoSection
      title="Toast"
      description="Toast notifications using Sonner for displaying brief, non-blocking messages. Supports success, error, warning, info, loading states, and custom content."
      codeExample={`import { toast } from 'sonner';
import { Toaster } from '@openzeppelin/ui-components';

// Add Toaster to your app (usually in main.tsx or App.tsx)
<Toaster />

// Show different toast types
toast('Default message');
toast.success('Success message');
toast.error('Error message');
toast.info('Info message');
toast.warning('Warning message');

// With description
toast.success('Transaction confirmed!', {
  description: 'Your transaction has been processed.',
});

// Loading toast that updates
const toastId = toast.loading('Processing...');
// Later...
toast.success('Done!', { id: toastId });

// Promise toast
toast.promise(asyncFunction(), {
  loading: 'Loading...',
  success: 'Success!',
  error: 'Error!',
});

// With action button
toast('Contract deployed', {
  action: {
    label: 'View',
    onClick: () => console.log('View clicked'),
  },
});`}
    >
      {/* Basic Toasts */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Toasts</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="outline" onClick={showBasicToast}>
            Default Toast
          </Button>
          <Button variant="outline" onClick={showSuccessToast} className="text-green-600">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Success
          </Button>
          <Button variant="outline" onClick={showErrorToast} className="text-red-600">
            <XCircle className="mr-2 h-4 w-4" />
            Error
          </Button>
          <Button variant="outline" onClick={showInfoToast} className="text-blue-600">
            <Info className="mr-2 h-4 w-4" />
            Info
          </Button>
          <Button variant="outline" onClick={showWarningToast} className="text-yellow-600">
            <AlertCircle className="mr-2 h-4 w-4" />
            Warning
          </Button>
        </div>
      </div>

      {/* Loading & Promise */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Loading States</h3>
        <p className="text-muted-foreground text-sm">
          Use loading toasts for async operations that update when complete:
        </p>
        <div className="flex flex-wrap gap-4">
          <Button variant="outline" onClick={showLoadingToast}>
            <Loader2 className="mr-2 h-4 w-4" />
            Loading Toast (3s)
          </Button>
          <Button variant="outline" onClick={showPromiseToast}>
            Promise Toast
          </Button>
        </div>
      </div>

      {/* With Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Actions</h3>
        <p className="text-muted-foreground text-sm">
          Toasts can include action buttons for quick interactions:
        </p>
        <div className="flex flex-wrap gap-4">
          <Button variant="outline" onClick={showActionToast}>
            Toast with Action
          </Button>
          <Button variant="outline" onClick={showCancelableToast}>
            Cancelable Toast
          </Button>
        </div>
      </div>

      {/* Custom Toast */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Custom Content</h3>
        <p className="text-muted-foreground text-sm">
          Create fully custom toast layouts for complex notifications:
        </p>
        <Button variant="outline" onClick={showCustomToast}>
          Custom Toast
        </Button>
      </div>

      {/* Positions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Positions</h3>
        <p className="text-muted-foreground text-sm">
          Toasts can appear in different screen positions:
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => showPositionedToast('top-left')}>
            Top Left
          </Button>
          <Button variant="outline" size="sm" onClick={() => showPositionedToast('top-center')}>
            Top Center
          </Button>
          <Button variant="outline" size="sm" onClick={() => showPositionedToast('top-right')}>
            Top Right
          </Button>
          <Button variant="outline" size="sm" onClick={() => showPositionedToast('bottom-left')}>
            Bottom Left
          </Button>
          <Button variant="outline" size="sm" onClick={() => showPositionedToast('bottom-center')}>
            Bottom Center
          </Button>
          <Button variant="outline" size="sm" onClick={() => showPositionedToast('bottom-right')}>
            Bottom Right
          </Button>
        </div>
      </div>

      {/* Blockchain Scenarios */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Blockchain Scenarios</h3>
        <div className="flex flex-wrap gap-4">
          <Button
            variant="outline"
            onClick={() =>
              toast.success('Wallet connected', {
                description: 'Connected to MetaMask on Ethereum Mainnet',
              })
            }
          >
            Wallet Connect
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const toastId = toast.loading('Switching network...');
              setTimeout(() => {
                toast.success('Switched to Polygon', { id: toastId });
              }, 1500);
            }}
          >
            Network Switch
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast('Transaction pending', {
                description: 'Hash: 0xabc...123',
                action: {
                  label: 'View on Etherscan',
                  onClick: () => window.open('https://etherscan.io', '_blank'),
                },
              })
            }
          >
            TX Submitted
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.error('Signature rejected', {
                description: 'User denied the signature request in wallet.',
              })
            }
          >
            Signature Rejected
          </Button>
        </div>
      </div>

      {/* Multiple Toasts */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Stacked Toasts</h3>
        <p className="text-muted-foreground text-sm">Multiple toasts stack automatically:</p>
        <Button
          variant="outline"
          onClick={() => {
            toast.success('Step 1: Approved');
            setTimeout(() => toast.success('Step 2: Transferred'), 500);
            setTimeout(() => toast.success('Step 3: Confirmed'), 1000);
          }}
        >
          Show Multiple Toasts
        </Button>
      </div>

      {/* Dismiss */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Programmatic Control</h3>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => {
              toast('This toast has an ID', {
                duration: Infinity,
                description: 'Click "Dismiss All" to remove it.',
              });
            }}
          >
            Persistent Toast
          </Button>
          <Button variant="outline" onClick={() => toast.dismiss()}>
            Dismiss All
          </Button>
        </div>
      </div>
    </DemoSection>
  );
}
