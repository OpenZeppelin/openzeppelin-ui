import { Button } from '~/sharp/frame/action-button';
import { Card, CardContent, CardHeader, CardTitle } from '~/sharp/frame/info-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/sharp/frame/tab-set';

export function Overview() {
  return (
    <div>
      <Card>
        <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="main">
            <TabsList>
              <TabsTrigger value="main">Main</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="main"><p>Main content</p></TabsContent>
            <TabsContent value="details"><p>Details</p></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Button>Save</Button>
    </div>
  );
}
