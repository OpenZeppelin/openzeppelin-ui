import { FileText, FolderOpen, Inbox, Search, Users, Wallet } from 'lucide-react';

import { Button, EmptyState } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates EmptyState component variations for showing helpful messages when content is unavailable
 */
export function EmptyStateDemo(): React.ReactElement {
  return (
    <DemoSection
      title="EmptyState"
      description="A reusable component for showing helpful messages when content is not available. Supports different sizes and custom icons to match various contexts."
      codeExample={`import { EmptyState } from '@openzeppelin/ui-components';
import { FileText } from 'lucide-react';

// Basic usage
<EmptyState
  title="No items found"
  description="Get started by creating your first item."
/>

// With custom icon
<EmptyState
  icon={<FileText className="h-6 w-6 text-muted-foreground" />}
  title="No documents"
  description="Upload a document to get started."
/>

// Different sizes
<EmptyState
  title="Empty"
  description="Nothing here yet."
  size="small"
/>`}
    >
      {/* Basic Usage */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic</h3>
        <div className="rounded-lg border">
          <EmptyState
            title="No items found"
            description="Get started by creating your first item. It only takes a few seconds."
          />
        </div>
      </div>

      {/* Size Variations */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Sizes</h3>
        <div className="grid gap-6">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Small</p>
            <div className="rounded-lg border">
              <EmptyState
                title="No results"
                description="Try adjusting your search."
                size="small"
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Default</p>
            <div className="rounded-lg border">
              <EmptyState
                title="No items found"
                description="Get started by creating your first item."
                size="default"
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Large</p>
            <div className="rounded-lg border">
              <EmptyState
                title="Welcome to your dashboard"
                description="This is where you'll see all your important data. Start by connecting your wallet or importing your first project."
                size="large"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Custom Icons */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Custom Icons</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border">
            <EmptyState
              icon={<Search className="text-muted-foreground h-6 w-6" />}
              title="No search results"
              description="We couldn't find anything matching your search. Try different keywords."
            />
          </div>
          <div className="rounded-lg border">
            <EmptyState
              icon={<Inbox className="text-muted-foreground h-6 w-6" />}
              title="Inbox zero"
              description="You've cleared all your notifications. Great job!"
            />
          </div>
          <div className="rounded-lg border">
            <EmptyState
              icon={<Users className="text-muted-foreground h-6 w-6" />}
              title="No team members"
              description="Invite team members to collaborate on this project."
            />
          </div>
          <div className="rounded-lg border">
            <EmptyState
              icon={<FolderOpen className="text-muted-foreground h-6 w-6" />}
              title="No files"
              description="This folder is empty. Upload files to get started."
            />
          </div>
        </div>
      </div>

      {/* Blockchain Use Cases */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Blockchain Use Cases</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border">
            <EmptyState
              icon={<Wallet className="text-muted-foreground h-6 w-6" />}
              title="No wallet connected"
              description="Connect your wallet to view your assets and interact with contracts."
            />
          </div>
          <div className="rounded-lg border">
            <EmptyState
              icon={<FileText className="text-muted-foreground h-6 w-6" />}
              title="No contracts deployed"
              description="Deploy your first smart contract to get started with your dApp."
            />
          </div>
        </div>
      </div>

      {/* With Action Buttons */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Actions</h3>
        <p className="text-muted-foreground text-sm">
          While EmptyState does not include built-in actions, you can easily compose it with
          buttons:
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border">
            <div className="flex flex-col items-center">
              <EmptyState
                icon={<Wallet className="text-muted-foreground h-6 w-6" />}
                title="No wallet connected"
                description="Connect your wallet to view your assets."
              />
              <div className="mb-8">
                <Button>Connect Wallet</Button>
              </div>
            </div>
          </div>
          <div className="rounded-lg border">
            <div className="flex flex-col items-center">
              <EmptyState
                icon={<FileText className="text-muted-foreground h-6 w-6" />}
                title="No contracts"
                description="Import or deploy a contract to begin."
              />
              <div className="mb-8 flex gap-2">
                <Button variant="outline">Import</Button>
                <Button>Deploy New</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* In Context */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">In Context</h3>
        <div className="rounded-lg border">
          <div className="border-b p-4">
            <h4 className="font-medium">Recent Transactions</h4>
          </div>
          <EmptyState
            title="No transactions yet"
            description="Your transaction history will appear here once you make your first transaction."
            size="small"
          />
        </div>
      </div>
    </DemoSection>
  );
}
