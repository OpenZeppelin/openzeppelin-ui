import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Banner, Button } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates Banner component variations for notifications and alerts
 */
export function BannerDemo(): React.ReactElement {
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());

  const handleDismiss = (id: string) => {
    setDismissedBanners((prev) => new Set([...prev, id]));
  };

  const resetBanners = () => {
    setDismissedBanners(new Set());
  };

  const isBannerVisible = (id: string) => !dismissedBanners.has(id);

  return (
    <DemoSection
      title="Banner"
      description="A dismissible banner component for notifications and alerts. Supports variants (info, success, warning, error, neutral) and size presets (default, compact) with customizable icons and optional titles."
      codeExample={`import { Banner } from '@openzeppelin/ui-components';
import { Info } from 'lucide-react';

// Basic info banner
<Banner variant="info">
  This is an informational message.
</Banner>

// Muted neutral panel for inline checklists and notices
<Banner variant="neutral" size="compact" title="Before you deploy" dismissible={false}>
  Review the checklist below before continuing.
</Banner>

// With title and icon
<Banner
  variant="success"
  title="Transaction Confirmed"
  icon={<CheckCircle className="h-5 w-5" />}
  onDismiss={() => handleDismiss()}
>
  Your transaction has been successfully processed.
</Banner>

// Non-dismissible
<Banner variant="error" dismissible={false}>
  Critical error occurred.
</Banner>`}
    >
      {/* Variants */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Variants</h3>
        <div className="space-y-4">
          <Banner variant="info" dismissible={false}>
            This is an informational banner. Use it for general announcements.
          </Banner>
          <Banner variant="success" dismissible={false}>
            This is a success banner. Use it to confirm completed actions.
          </Banner>
          <Banner variant="warning" dismissible={false}>
            This is a warning banner. Use it to alert users to potential issues.
          </Banner>
          <Banner variant="error" dismissible={false}>
            This is an error banner. Use it to communicate critical problems.
          </Banner>
          <Banner variant="neutral" dismissible={false}>
            This is a neutral banner. Use it for muted inline panels that should not compete with
            primary content.
          </Banner>
        </div>
      </div>

      {/* Size presets */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Size Presets</h3>
        <p className="text-muted-foreground text-sm">
          Use <code className="text-xs">size="compact"</code> for denser wizard panels and secondary
          notices. Default sizing works well for page-level alerts.
        </p>
        <div className="space-y-4">
          <Banner variant="info" title="Default size" dismissible={false}>
            Default padding and text-sm typography for prominent announcements.
          </Banner>
          <Banner variant="info" size="compact" title="Compact size" dismissible={false}>
            Compact padding and text-xs typography for inline forms and checklists.
          </Banner>
          <Banner
            variant="neutral"
            size="compact"
            title="Before you deploy"
            icon={<Info className="size-4" aria-hidden />}
            dismissible={false}
          >
            Confirm the admin address and acknowledge the deploy signer before continuing.
          </Banner>
        </div>
      </div>

      {/* Neutral variant */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Neutral Variant</h3>
        <p className="text-muted-foreground text-sm">
          Neutral banners use semantic surface tokens (<code className="text-xs">bg-muted/30</code>,{' '}
          <code className="text-xs">border-border</code>) instead of semantic colors. Pair with{' '}
          <code className="text-xs">size="compact"</code> for wizard-style notices.
        </p>
        <div className="space-y-4">
          <Banner variant="neutral" title="After download" dismissible={false}>
            Generated artifacts are ready. Review the README for deploy steps.
          </Banner>
          <Banner
            variant="neutral"
            size="compact"
            title="Deploy readiness"
            icon={<Info className="size-4" aria-hidden />}
            dismissible={false}
          >
            <div className="space-y-2">
              <p>Configured admin: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e</p>
              <p className="text-muted-foreground">
                Check the box below to confirm your deploy signer controls this address.
              </p>
            </div>
          </Banner>
        </div>
      </div>

      {/* With Titles */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Titles</h3>
        <div className="space-y-4">
          <Banner variant="info" title="Scheduled Maintenance" dismissible={false}>
            The system will be undergoing maintenance on Saturday from 2:00 AM to 4:00 AM UTC.
          </Banner>
          <Banner variant="success" title="Transaction Confirmed" dismissible={false}>
            Your transaction has been successfully confirmed on the blockchain. Gas used: 21,000
            units.
          </Banner>
          <Banner variant="warning" title="Network Congestion" dismissible={false}>
            The network is currently experiencing high traffic. Transactions may take longer than
            usual.
          </Banner>
          <Banner variant="error" title="Connection Failed" dismissible={false}>
            Unable to connect to the RPC endpoint. Please check your network settings.
          </Banner>
        </div>
      </div>

      {/* With Icons */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Custom Icons</h3>
        <div className="space-y-4">
          <Banner
            variant="info"
            title="New Feature Available"
            icon={<Info className="h-5 w-5" />}
            dismissible={false}
          >
            Check out our new contract deployment wizard for easier setup.
          </Banner>
          <Banner
            variant="success"
            title="Wallet Connected"
            icon={<CheckCircle className="h-5 w-5" />}
            dismissible={false}
          >
            Your wallet has been successfully connected to the application.
          </Banner>
          <Banner
            variant="warning"
            title="Low Gas Balance"
            icon={<AlertTriangle className="h-5 w-5" />}
            dismissible={false}
          >
            Your gas balance is running low. Consider topping up to avoid failed transactions.
          </Banner>
          <Banner
            variant="error"
            title="Transaction Reverted"
            icon={<XCircle className="h-5 w-5" />}
            dismissible={false}
          >
            The transaction was reverted. Reason: Insufficient allowance.
          </Banner>
        </div>
      </div>

      {/* Dismissible */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Dismissible</h3>
          {dismissedBanners.size > 0 && (
            <Button variant="outline" size="sm" onClick={resetBanners}>
              Reset Banners
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          Click the X button to dismiss these banners:
        </p>
        <div className="space-y-4">
          {isBannerVisible('dismiss-1') && (
            <Banner
              variant="info"
              title="Dismissible Info"
              icon={<Info className="h-5 w-5" />}
              onDismiss={() => handleDismiss('dismiss-1')}
            >
              Click the X to dismiss this banner.
            </Banner>
          )}
          {isBannerVisible('dismiss-2') && (
            <Banner
              variant="success"
              title="Dismissible Success"
              icon={<CheckCircle className="h-5 w-5" />}
              onDismiss={() => handleDismiss('dismiss-2')}
            >
              This banner can also be dismissed.
            </Banner>
          )}
          {isBannerVisible('dismiss-3') && (
            <Banner
              variant="warning"
              icon={<AlertTriangle className="h-5 w-5" />}
              onDismiss={() => handleDismiss('dismiss-3')}
            >
              Warning without a title - still dismissible.
            </Banner>
          )}
          {dismissedBanners.size === 3 && (
            <div className="text-muted-foreground py-4 text-center text-sm">
              All banners dismissed. Click &quot;Reset Banners&quot; to restore them.
            </div>
          )}
        </div>
      </div>

      {/* Blockchain Use Cases */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Blockchain Use Cases</h3>
        <div className="space-y-4">
          <Banner
            variant="info"
            title="Contract Verification"
            icon={<Info className="h-5 w-5" />}
            dismissible={false}
          >
            Your contract is being verified on Etherscan. This may take a few minutes.
          </Banner>
          <Banner
            variant="success"
            title="Role Granted"
            icon={<CheckCircle className="h-5 w-5" />}
            dismissible={false}
          >
            Successfully granted MINTER_ROLE to 0x742d...1D3F4. Transaction hash: 0xabc123...
          </Banner>
          <Banner
            variant="warning"
            title="Testnet Network"
            icon={<AlertTriangle className="h-5 w-5" />}
            dismissible={false}
          >
            You are connected to Sepolia testnet. Transactions use test ETH with no real value.
          </Banner>
          <Banner
            variant="error"
            title="Insufficient Gas"
            icon={<XCircle className="h-5 w-5" />}
            dismissible={false}
          >
            Transaction failed due to insufficient gas. Please increase your gas limit and try
            again.
          </Banner>
        </div>
      </div>

      {/* In Context */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">In Context</h3>
        <div className="rounded-lg border">
          <Banner
            variant="warning"
            title="Testnet Mode"
            icon={<AlertTriangle className="h-5 w-5" />}
            className="rounded-b-none border-0"
            dismissible={false}
          >
            You are viewing testnet data. Switch to mainnet for production contracts.
          </Banner>
          <div className="p-4">
            <h4 className="mb-2 font-medium">Contract Dashboard</h4>
            <p className="text-muted-foreground text-sm">
              Manage your deployed contracts and access control settings.
            </p>
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
