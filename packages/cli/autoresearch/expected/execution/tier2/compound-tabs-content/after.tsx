import { Tabs, TabsContent, TabsList, TabsTrigger } from '@openzeppelin/ui-components';

interface SettingsProps {
  defaultTab?: string;
}

export function Settings({ defaultTab = 'general' }: SettingsProps) {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      <TabsContent value="general">
        <p>General settings content here.</p>
      </TabsContent>
      <TabsContent value="security">
        <p>Security settings content here.</p>
      </TabsContent>
      <TabsContent value="notifications">
        <p>Notification preferences here.</p>
      </TabsContent>
    </Tabs>
  );
}
