import {
  Cloud,
  CreditCard,
  Github,
  Keyboard,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  PlusCircle,
  Settings,
  User,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates DropdownMenu component for displaying menus triggered by a button.
 * Shows basic menus, checkboxes, radio groups, sub-menus, and shortcuts.
 */
export function DropdownMenuDemo(): React.ReactElement {
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [showActivityBar, setShowActivityBar] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [network, setNetwork] = useState('mainnet');

  return (
    <DemoSection
      title="DropdownMenu"
      description="A menu component triggered by a button, supporting items, checkboxes, radio groups, sub-menus, and keyboard shortcuts. Built on Radix UI Dropdown Menu."
      codeExample={`import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@openzeppelin/ui-components';

// Basic dropdown
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuItem>Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// With icons and shortcuts
<DropdownMenuItem>
  <User className="mr-2 h-4 w-4" />
  <span>Profile</span>
  <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
</DropdownMenuItem>

// Checkbox items
<DropdownMenuCheckboxItem
  checked={showPanel}
  onCheckedChange={setShowPanel}
>
  Show Panel
</DropdownMenuCheckboxItem>

// Radio items
<DropdownMenuRadioGroup value={network} onValueChange={setNetwork}>
  <DropdownMenuRadioItem value="mainnet">Mainnet</DropdownMenuRadioItem>
  <DropdownMenuRadioItem value="testnet">Testnet</DropdownMenuRadioItem>
</DropdownMenuRadioGroup>`}
    >
      {/* Basic Dropdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Dropdown</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Open Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Billing</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* With Shortcuts */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Keyboard Shortcuts</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Plus className="mr-2 h-4 w-4" />
              <span>New Contract</span>
              <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Wallet className="mr-2 h-4 w-4" />
              <span>Connect Wallet</span>
              <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Keyboard className="mr-2 h-4 w-4" />
              <span>Keyboard Shortcuts</span>
              <DropdownMenuShortcut>⌘/</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Checkbox Items */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Checkbox Items</h3>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">View Options</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Appearance</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={showStatusBar} onCheckedChange={setShowStatusBar}>
                Show Status Bar
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showActivityBar}
                onCheckedChange={setShowActivityBar}
              >
                Show Activity Bar
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={showPanel} onCheckedChange={setShowPanel}>
                Show Panel
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="text-muted-foreground text-sm">
            Status: {showStatusBar ? '✓' : '✗'} | Activity: {showActivityBar ? '✓' : '✗'} | Panel:{' '}
            {showPanel ? '✓' : '✗'}
          </div>
        </div>
      </div>

      {/* Radio Items */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Radio Items</h3>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Select Network</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Network</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={network} onValueChange={setNetwork}>
                <DropdownMenuRadioItem value="mainnet">Ethereum Mainnet</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="sepolia">Sepolia Testnet</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="polygon">Polygon</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="arbitrum">Arbitrum One</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="text-muted-foreground text-sm">
            Selected:{' '}
            <code className="bg-muted rounded px-1">
              {network.charAt(0).toUpperCase() + network.slice(1)}
            </code>
          </div>
        </div>
      </div>

      {/* Sub-menus */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Sub-menus</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">More Options</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Users className="mr-2 h-4 w-4" />
                <span>Team</span>
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span>Invite users</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>
                      <Mail className="mr-2 h-4 w-4" />
                      <span>Email</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Message</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      <span>More...</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuItem>
                <Plus className="mr-2 h-4 w-4" />
                <span>New Team</span>
                <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Github className="mr-2 h-4 w-4" />
              <span>GitHub</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LifeBuoy className="mr-2 h-4 w-4" />
              <span>Support</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Cloud className="mr-2 h-4 w-4" />
              <span>API</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
              <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Blockchain Use Case */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Wallet Actions</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Wallet className="mr-2 h-4 w-4" />
              0x742d...1D3F4
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Connected Wallet</p>
                <p className="text-muted-foreground truncate font-mono text-xs">
                  0x742d35Cc6634C0532925a3b844Bc454e4438f44e
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>View Balance</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Switch Network</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Ethereum Mainnet</DropdownMenuItem>
                  <DropdownMenuItem>Polygon</DropdownMenuItem>
                  <DropdownMenuItem>Arbitrum One</DropdownMenuItem>
                  <DropdownMenuItem>Optimism</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Add Network...</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Disconnect</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Disabled Items */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Disabled Items</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Menu with Disabled</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Features</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <span>Available Feature</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <span>Premium Feature (Upgrade Required)</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <span>Coming Soon</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <span>Another Available Feature</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Grouped Items */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Grouped Items</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Contract Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Read Functions</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem>balanceOf()</DropdownMenuItem>
              <DropdownMenuItem>totalSupply()</DropdownMenuItem>
              <DropdownMenuItem>allowance()</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Write Functions</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem>transfer()</DropdownMenuItem>
              <DropdownMenuItem>approve()</DropdownMenuItem>
              <DropdownMenuItem>transferFrom()</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Admin Functions</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem>mint()</DropdownMenuItem>
              <DropdownMenuItem>burn()</DropdownMenuItem>
              <DropdownMenuItem>pause()</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </DemoSection>
  );
}
