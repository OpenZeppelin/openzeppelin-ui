import { useState } from 'react';

import { Label, Switch } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates the Switch primitive: label association, keyboard toggling and the disabled state.
 */
export function SwitchDemo(): React.ReactElement {
  const [notifications, setNotifications] = useState(false);

  return (
    <DemoSection
      title="Switch"
      description="An on/off control built on Radix UI primitives. Click it or press Space to toggle; it exposes the switch role and checked state."
      codeExample={`import { Label, Switch } from '@openzeppelin/ui-components';

<div className="flex items-center space-x-2">
  <Switch id="notifications" checked={on} onCheckedChange={setOn} />
  <Label htmlFor="notifications">Notifications</Label>
</div>`}
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
    </DemoSection>
  );
}
