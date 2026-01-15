import { CreditCard, Settings, Shield, Users, Wallet } from 'lucide-react';
import type { ReactElement } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates Card component variations for content containers.
 * Shows basic cards, cards with headers/footers, and blockchain-specific use cases.
 */
export function CardDemo(): ReactElement {
  return (
    <DemoSection
      title="Card"
      description="A versatile container component for grouping related content. Supports header, content, description, and footer sections with consistent styling."
      codeExample={`import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-components';

// Basic card
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here.</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// Card with icon
<Card>
  <CardHeader>
    <div className="flex items-center gap-2">
      <Wallet className="h-5 w-5" />
      <CardTitle>Wallet Status</CardTitle>
    </div>
    <CardDescription>Connected to Ethereum Mainnet</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Balance: 1.5 ETH</p>
  </CardContent>
</Card>`}
    >
      {/* Basic Card */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Card</h3>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>
              This is a basic card with header and content sections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Cards are versatile containers that group related content together. They provide
              visual separation and hierarchy in your interface.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Card with Footer */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Card with Footer</h3>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>
              Manage your account preferences and security settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Update your email, change your password, or configure two-factor authentication from
              this panel.
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">Cancel</Button>
            <Button>Save Changes</Button>
          </CardFooter>
        </Card>
      </div>

      {/* Card with Icon */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Card with Icon</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary rounded-lg p-2">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Wallet Connected</CardTitle>
                  <CardDescription>Ethereum Mainnet</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance</span>
                  <span className="font-medium">1.5 ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-mono">0x742d...1D3F4</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary rounded-lg p-2">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Security Status</CardTitle>
                  <CardDescription>All systems operational</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">2FA</span>
                  <span className="font-medium text-green-600">Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Login</span>
                  <span className="font-medium">2 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Blockchain Use Cases */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Blockchain Use Cases</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Contract Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="text-muted-foreground h-4 w-4" />
                <CardTitle className="text-base">Token Contract</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span>MyToken</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Symbol</span>
                <span>MTK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supply</span>
                <span>1,000,000</span>
              </div>
            </CardContent>
          </Card>

          {/* Role Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="text-muted-foreground h-4 w-4" />
                <CardTitle className="text-base">Access Roles</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin</span>
                <span className="font-mono text-xs">0x123...abc</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minter</span>
                <span className="font-mono text-xs">0x456...def</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pauser</span>
                <span className="font-mono text-xs">0x789...ghi</span>
              </div>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Settings className="text-muted-foreground h-4 w-4" />
                <CardTitle className="text-base">Configuration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max TX</span>
                <span>10 ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cooldown</span>
                <span>24 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee</span>
                <span>0.1%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interactive Card */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Interactive Card</h3>
        <Card className="hover:bg-muted/50 w-full max-w-md cursor-pointer transition-colors">
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>Click to view full transaction information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hash</span>
                <span className="font-mono">0xabc...123</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="text-green-600">Confirmed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Block</span>
                <span>18,542,301</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="link" className="p-0">
              View on Explorer →
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Card Grid Layout */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Card Grid Layout</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Total Supply', value: '1,000,000', change: '+12.5%' },
            { title: 'Holders', value: '2,847', change: '+5.2%' },
            { title: 'Transactions', value: '15,234', change: '+8.1%' },
            { title: 'Market Cap', value: '$2.5M', change: '+3.7%' },
          ].map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="pb-2">
                <CardDescription>{stat.title}</CardDescription>
                <CardTitle className="text-2xl">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-green-600">{stat.change} from last month</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DemoSection>
  );
}
