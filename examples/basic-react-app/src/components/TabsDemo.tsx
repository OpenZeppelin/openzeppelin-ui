import { Code, FileText, Settings, Shield, Users, Wallet } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates Tabs component for organizing content into switchable panels.
 * Shows basic tabs, tabs with icons, and blockchain-specific use cases.
 */
export function TabsDemo(): React.ReactElement {
  const [activeTab, setActiveTab] = useState('account');

  return (
    <DemoSection
      title="Tabs"
      description="A tabbed interface component for organizing content into logical sections. Built on Radix UI Tabs with accessible keyboard navigation."
      codeExample={`import { Tabs, TabsContent, TabsList, TabsTrigger } from '@openzeppelin/ui-components';

// Basic tabs
<Tabs defaultValue="account">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="account">
    Account content here.
  </TabsContent>
  <TabsContent value="settings">
    Settings content here.
  </TabsContent>
</Tabs>

// Tabs with icons
<Tabs defaultValue="wallet">
  <TabsList>
    <TabsTrigger value="wallet">
      <Wallet className="h-4 w-4" />
      Wallet
    </TabsTrigger>
    <TabsTrigger value="security">
      <Shield className="h-4 w-4" />
      Security
    </TabsTrigger>
  </TabsList>
  {/* Content panels */}
</Tabs>

// Controlled tabs
const [activeTab, setActiveTab] = useState('overview');

<Tabs value={activeTab} onValueChange={setActiveTab}>
  {/* Tabs content */}
</Tabs>`}
    >
      {/* Basic Tabs */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Tabs</h3>
        <Tabs defaultValue="account" className="w-full max-w-md">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account information and preferences.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Update your display name, email, and other account details.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="password" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Change your password to keep your account secure.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Use a strong password with at least 8 characters.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="notifications" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure how you receive notifications.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Choose which events trigger email or push notifications.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Tabs with Icons */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Tabs with Icons</h3>
        <Tabs defaultValue="wallet" className="w-full max-w-lg">
          <TabsList>
            <TabsTrigger value="wallet" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
          <TabsContent value="wallet" className="mt-4">
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="font-medium">Wallet Overview</h4>
              <div className="text-muted-foreground space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Address</span>
                  <span className="font-mono">0x742d...1D3F4</span>
                </div>
                <div className="flex justify-between">
                  <span>Network</span>
                  <span>Ethereum Mainnet</span>
                </div>
                <div className="flex justify-between">
                  <span>Balance</span>
                  <span className="font-medium">1.5 ETH</span>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="security" className="mt-4">
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="font-medium">Security Settings</h4>
              <div className="text-muted-foreground space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Two-Factor Auth</span>
                  <span className="text-green-600">Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span>Hardware Wallet</span>
                  <span>Ledger Nano X</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Login</span>
                  <span>2 hours ago</span>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="settings" className="mt-4">
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="font-medium">General Settings</h4>
              <div className="text-muted-foreground space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Theme</span>
                  <span>Dark</span>
                </div>
                <div className="flex justify-between">
                  <span>Currency</span>
                  <span>USD</span>
                </div>
                <div className="flex justify-between">
                  <span>Language</span>
                  <span>English</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Blockchain Use Case - Contract Tabs */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Contract Details</h3>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="code">
              <Code className="mr-1 h-4 w-4" />
              Code
            </TabsTrigger>
            <TabsTrigger value="roles">
              <Users className="mr-1 h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="events">
              <FileText className="mr-1 h-4 w-4" />
              Events
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Contract Address</CardDescription>
                  <CardTitle className="font-mono text-sm">0x1234...5678</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Network</CardDescription>
                  <CardTitle className="text-sm">Ethereum Mainnet</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Token Standard</CardDescription>
                  <CardTitle className="text-sm">ERC-20</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Supply</CardDescription>
                  <CardTitle className="text-sm">1,000,000 MTK</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="code" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Source Code</CardTitle>
                <CardDescription>Verified contract source code</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
                  <code>{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}`}</code>
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="roles" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Access Control</CardTitle>
                <CardDescription>Roles assigned to this contract</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium">Owner</div>
                      <div className="text-muted-foreground font-mono text-xs">0xabc...def</div>
                    </div>
                    <span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs">
                      Admin
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium">Minter Role</div>
                      <div className="text-muted-foreground font-mono text-xs">0x123...456</div>
                    </div>
                    <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-600">
                      Minter
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="events" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Events</CardTitle>
                <CardDescription>Last 5 contract events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {[
                    { event: 'Transfer', from: '0x123...', to: '0x456...', amount: '100 MTK' },
                    { event: 'Approval', from: '0x789...', to: '0xabc...', amount: '500 MTK' },
                    { event: 'Transfer', from: '0xdef...', to: '0x123...', amount: '250 MTK' },
                  ].map((evt, i) => (
                    <div key={i} className="flex items-center justify-between rounded border p-2">
                      <span className="font-medium">{evt.event}</span>
                      <span className="text-muted-foreground">
                        {evt.from} → {evt.to}
                      </span>
                      <span className="font-mono text-xs">{evt.amount}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Controlled Tabs */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Controlled Tabs</h3>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'account' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('account')}
            >
              Go to Account
            </Button>
            <Button
              variant={activeTab === 'billing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('billing')}
            >
              Go to Billing
            </Button>
            <Button
              variant={activeTab === 'team' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('team')}
            >
              Go to Team
            </Button>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
            <TabsList>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="mt-4">
              <div className="rounded-lg border p-4">
                <h4 className="font-medium">Account Information</h4>
                <p className="text-muted-foreground mt-2 text-sm">
                  Manage your account settings and preferences.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="billing" className="mt-4">
              <div className="rounded-lg border p-4">
                <h4 className="font-medium">Billing Details</h4>
                <p className="text-muted-foreground mt-2 text-sm">
                  View and manage your billing information and invoices.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="team" className="mt-4">
              <div className="rounded-lg border p-4">
                <h4 className="font-medium">Team Members</h4>
                <p className="text-muted-foreground mt-2 text-sm">
                  Invite team members and manage their permissions.
                </p>
              </div>
            </TabsContent>
          </Tabs>
          <p className="text-muted-foreground text-sm">
            Current tab: <code className="bg-muted rounded px-1">{activeTab}</code>
          </p>
        </div>
      </div>

      {/* Disabled Tab */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Disabled Tabs</h3>
        <Tabs defaultValue="active" className="w-full max-w-md">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="premium" disabled>
              Premium (Locked)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm">Active features available to all users.</p>
            </div>
          </TabsContent>
          <TabsContent value="pending" className="mt-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm">Pending features in beta testing.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DemoSection>
  );
}
