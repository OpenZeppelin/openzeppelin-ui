import { useState } from 'react';

import { Checkbox, Label } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates Checkbox component variations and usage patterns
 */
export function CheckboxDemo(): React.ReactElement {
  const [checked, setChecked] = useState(false);
  const [terms, setTerms] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
  });

  return (
    <DemoSection
      title="Checkbox"
      description="A checkbox component for toggling boolean values, built on Radix UI primitives with full accessibility support."
      codeExample={`import { Checkbox, Label } from '@openzeppelin/ui-components';

<div className="flex items-center space-x-2">
  <Checkbox id="terms" checked={checked} onCheckedChange={setChecked} />
  <Label htmlFor="terms">Accept terms and conditions</Label>
</div>`}
    >
      {/* Recommendation Note */}
      <div className="bg-muted/50 rounded-lg border p-4">
        <p className="text-sm">
          <strong>💡 For forms:</strong> Use{' '}
          <code className="bg-muted rounded px-1">BooleanField</code> from{' '}
          <code className="bg-muted rounded px-1">@openzeppelin/ui-components/fields</code> which
          includes built-in label, validation, and React Hook Form integration. The primitive{' '}
          <code className="bg-muted rounded px-1">Checkbox</code> shown here is for custom
          compositions.
        </p>
      </div>

      {/* Basic Usage */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic</h3>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="basic"
            checked={checked}
            onCheckedChange={(value) => setChecked(value === true)}
          />
          <Label htmlFor="basic">
            Enable feature
            {checked && <span className="text-muted-foreground ml-2">(enabled)</span>}
          </Label>
        </div>
      </div>

      {/* Controlled State */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">States</h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="unchecked" checked={false} />
            <Label htmlFor="unchecked">Unchecked</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="checked" checked={true} />
            <Label htmlFor="checked">Checked</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="disabled-unchecked" disabled />
            <Label htmlFor="disabled-unchecked" className="text-muted-foreground">
              Disabled (unchecked)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="disabled-checked" checked disabled />
            <Label htmlFor="disabled-checked" className="text-muted-foreground">
              Disabled (checked)
            </Label>
          </div>
        </div>
      </div>

      {/* With Description */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Description</h3>
        <div className="max-w-md space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms-agreement"
              checked={terms}
              onCheckedChange={(value) => setTerms(value === true)}
              className="mt-1"
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="terms-agreement" className="font-medium">
                Accept terms and conditions
              </Label>
              <p className="text-muted-foreground text-sm">
                You agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Checkbox Group */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Checkbox Group</h3>
        <div className="max-w-md space-y-4">
          <p className="text-sm font-medium">Notification Preferences</p>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="email-notifications"
                checked={notifications.email}
                onCheckedChange={(value) =>
                  setNotifications((prev) => ({ ...prev, email: value === true }))
                }
              />
              <Label htmlFor="email-notifications">Email notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="push-notifications"
                checked={notifications.push}
                onCheckedChange={(value) =>
                  setNotifications((prev) => ({ ...prev, push: value === true }))
                }
              />
              <Label htmlFor="push-notifications">Push notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sms-notifications"
                checked={notifications.sms}
                onCheckedChange={(value) =>
                  setNotifications((prev) => ({ ...prev, sms: value === true }))
                }
              />
              <Label htmlFor="sms-notifications">SMS notifications</Label>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            Selected:{' '}
            {Object.entries(notifications)
              .filter(([, v]) => v)
              .map(([k]) => k)
              .join(', ') || 'none'}
          </p>
        </div>
      </div>

      {/* Error State */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Error State</h3>
        <div className="max-w-md">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="required-checkbox"
              aria-invalid="true"
              className="mt-1 border-destructive"
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="required-checkbox" className="font-medium">
                I confirm my wallet address is correct *
              </Label>
              <p className="text-destructive text-sm">You must confirm this before proceeding</p>
            </div>
          </div>
        </div>
      </div>

      {/* Blockchain Use Cases */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Blockchain Use Cases</h3>
        <div className="max-w-md space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox id="gas-approve" className="mt-1" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="gas-approve" className="font-medium">
                Use maximum gas limit
              </Label>
              <p className="text-muted-foreground text-sm">
                Automatically use the maximum recommended gas limit for this transaction.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Checkbox id="simulate-tx" defaultChecked className="mt-1" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="simulate-tx" className="font-medium">
                Simulate before sending
              </Label>
              <p className="text-muted-foreground text-sm">
                Run a simulation to check if the transaction will succeed.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Checkbox id="remember-network" className="mt-1" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="remember-network" className="font-medium">
                Remember network selection
              </Label>
              <p className="text-muted-foreground text-sm">
                Save this network as your default for future sessions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
