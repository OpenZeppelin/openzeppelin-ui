import { AlertTriangle, Settings, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates Dialog component variations for modal interactions.
 * Shows basic dialogs, forms, confirmations, and various content types.
 */
export function DialogDemo(): React.ReactElement {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDelete = () => {
    setIsProcessing(true);
    // Simulate async operation
    setTimeout(() => {
      setIsProcessing(false);
      setIsDeleteDialogOpen(false);
    }, 1500);
  };

  return (
    <DemoSection
      title="Dialog"
      description="A modal dialog component for displaying content that requires user interaction. Built on Radix UI Dialog with animations and accessibility features."
      codeExample={`import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
} from '@openzeppelin/ui-components';

// Basic dialog
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        This is a description of the dialog content.
      </DialogDescription>
    </DialogHeader>
    <p>Your dialog content goes here.</p>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Controlled dialog
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    {/* content */}
  </DialogContent>
</Dialog>`}
    >
      {/* Basic Dialog */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Dialog</h3>
        <div className="flex gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open Basic Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Basic Dialog</DialogTitle>
                <DialogDescription>
                  This is a simple dialog with a title and description. Click outside or press
                  Escape to close.
                </DialogDescription>
              </DialogHeader>
              <p className="text-muted-foreground text-sm">
                Dialog content can include any React components. This is useful for displaying
                additional information or gathering user input.
              </p>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dialog with Form */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Form</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Invite a new member to your team. They will receive an email invitation.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Enter name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="team@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Wallet Address</Label>
                <Input id="address" placeholder="0x..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Confirmation Dialog */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Confirmation Dialog</h3>
        <p className="text-muted-foreground text-sm">
          Use controlled dialogs for confirmation flows with async operations:
        </p>
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Contract
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirm Deletion
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this contract? This action cannot be undone and all
                associated data will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-destructive/10 rounded-lg p-4">
              <p className="text-destructive text-sm font-medium">Contract: MyToken.sol</p>
              <p className="text-muted-foreground text-sm">
                Address: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isProcessing}>
                {isProcessing ? 'Deleting...' : 'Delete Contract'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Settings Dialog */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Settings Dialog</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Network Settings
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Network Settings</DialogTitle>
              <DialogDescription>
                Configure your network preferences for smart contract interactions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="rpc">RPC URL</Label>
                <Input id="rpc" placeholder="https://mainnet.infura.io/v3/..." />
                <p className="text-muted-foreground text-xs">
                  Enter the RPC endpoint for your preferred network.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="chainId">Chain ID</Label>
                <Input id="chainId" type="number" placeholder="1" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gasLimit">Gas Limit</Label>
                <Input id="gasLimit" type="number" placeholder="21000" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">Reset to Default</Button>
              <Button>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Blockchain Transaction Dialog */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Transaction Confirmation</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Confirm Transaction</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Transaction</DialogTitle>
              <DialogDescription>Review the transaction details before signing.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Function</span>
                  <span className="font-mono">transfer(address,uint256)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-mono">0x742d...f44e</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span>100 USDC</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. Gas Fee</span>
                  <span>~0.002 ETH ($4.50)</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">Reject</Button>
              <Button>Sign & Send</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Information Dialog */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Information Dialog</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary">View Contract Details</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Contract Details</DialogTitle>
              <DialogDescription>
                Detailed information about the deployed smart contract.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Contract Name</p>
                  <p className="font-medium">MyGovernanceToken</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Network</p>
                  <p className="font-medium">Ethereum Mainnet</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Compiler Version</p>
                  <p className="font-medium font-mono">0.8.20</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Deployed</p>
                  <p className="font-medium">Jan 15, 2026</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-sm">Contract Address</p>
                <p className="font-mono text-sm break-all bg-muted p-2 rounded">
                  0x742d35Cc6634C0532925a3b844Bc454e4438f44e
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DemoSection>
  );
}
