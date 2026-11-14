import { useState } from 'react';

import { Label, Switch } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates the Switch primitive: label association, keyboard toggling, and the disabled and
 * read-only states.
 */
export function SwitchDemo(): React.ReactElement {
  const [notifications, setNotifications] = useState(false);
  const [readOnlyOn, setReadOnlyOn] = useState(true);
  const [readOnlyOff, setReadOnlyOff] = useState(false);
  const [readOnlyChanges, setReadOnlyChanges] = useState(0);

  return (
    <DemoSection
      title="Switch"
      description="An on/off control built on Radix UI primitives. Click it or press Space to toggle; it exposes the switch role and checked state."
      codeExample={`import { Label, Switch } from '@openzeppelin/ui-components';

<div className="flex items-center space-x-2">
  <Switch id="notifications" checked={on} onCheckedChange={setOn} />
  <Label htmlFor="notifications">Notifications</Label>
</div>

// Read-only: focusable, full colour, aria-readonly, ignores input. disabled wins.
<Switch id="auto-renew" checked={autoRenew} onCheckedChange={setAutoRenew} readOnly />`}
    >
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic</h3>
        <div className="flex items-center space-x-2">
          <Switch
            id="switch-notifications"
            checked={notifications}
            onCheckedChange={setNotifications}
          />
          <Label htmlFor="switch-notifications">Notifications</Label>
        </div>
        <p className="text-muted-foreground text-sm" data-testid="switch-readout">
          Notifications are {notifications ? 'on' : 'off'}
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Disabled</h3>
        <div className="flex items-center space-x-2">
          <Switch id="switch-disabled-off" disabled />
          <Label htmlFor="switch-disabled-off">Disabled (off)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="switch-disabled-on" disabled defaultChecked />
          <Label htmlFor="switch-disabled-on">Disabled (on)</Label>
        </div>
      </div>

      <div className="space-y-4" data-testid="switch-readonly-demo">
        <h3 className="text-lg font-medium">Read-only</h3>
        <p className="text-muted-foreground text-sm">
          Pass <code>readOnly</code> to show a value the user can&apos;t change. The switch stays
          focusable and in full colour, reports <code>aria-readonly</code>, and ignores clicks,
          label clicks, Space and Enter. <code>disabled</code> wins when both are set.
        </p>
        <div className="flex items-center space-x-2">
          <Switch
            id="switch-readonly-on"
            checked={readOnlyOn}
            onCheckedChange={(checked) => {
              setReadOnlyOn(checked);
              setReadOnlyChanges((count) => count + 1);
            }}
            readOnly
          />
          <Label htmlFor="switch-readonly-on">Read-only (on)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="switch-readonly-off"
            checked={readOnlyOff}
            onCheckedChange={(checked) => {
              setReadOnlyOff(checked);
              setReadOnlyChanges((count) => count + 1);
            }}
            readOnly
          />
          <Label htmlFor="switch-readonly-off">Read-only (off)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="switch-readonly-disabled"
            defaultChecked
            onCheckedChange={() => setReadOnlyChanges((count) => count + 1)}
            readOnly
            disabled
          />
          <Label htmlFor="switch-readonly-disabled">Read-only and disabled</Label>
        </div>
        <p className="text-muted-foreground text-sm" data-testid="switch-readonly-changes">
          Changes: {readOnlyChanges}
        </p>
      </div>
    </DemoSection>
  );
}
