import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function Dashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Deployment Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={67} />
          <p className="mt-2 text-sm text-muted-foreground">67% complete</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary">Deploy</Button>
              </TooltipTrigger>
              <TooltipContent>Deploy to mainnet</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="outline">View Logs</Button>
        </CardContent>
      </Card>
    </div>
  );
}
