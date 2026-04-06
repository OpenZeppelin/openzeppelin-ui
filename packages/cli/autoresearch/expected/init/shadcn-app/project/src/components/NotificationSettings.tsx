import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';

export function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-medium">Email Notifications</h3>
        <div className="flex items-center gap-2">
          <Checkbox id="deploy-notify" />
          <Label htmlFor="deploy-notify">Deployment alerts</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="security-notify" defaultChecked />
          <Label htmlFor="security-notify">Security alerts</Label>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">Frequency</h3>
        <RadioGroup defaultValue="daily">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="realtime" id="realtime" />
            <Label htmlFor="realtime">Real-time</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="daily" id="daily" />
            <Label htmlFor="daily">Daily digest</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="weekly" id="weekly" />
            <Label htmlFor="weekly">Weekly summary</Label>
          </div>
        </RadioGroup>
      </div>

      <Button>Save Preferences</Button>
    </div>
  );
}
