import React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openzeppelin/ui-components';
import type { RelayerCapability } from '@openzeppelin/ui-types';
import { filterEnabledServiceForms } from '@openzeppelin/ui-utils';

import { NetworkServiceSettingsPanel } from './NetworkServiceSettingsPanel';

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  networkConfig: { id: string; name: string } | null;
  relayer: RelayerCapability | null;
  onSettingsChanged?: () => void;
}

export const NetworkSettingsDialog: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  networkConfig,
  relayer,
  onSettingsChanged,
}) => {
  const services = filterEnabledServiceForms(relayer?.getNetworkServiceForms() ?? []);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Network Settings</DialogTitle>
          <DialogDescription>Configure settings for {networkConfig?.name}</DialogDescription>
        </DialogHeader>

        {networkConfig && relayer && services.length > 0 ? (
          <Tabs defaultValue={services[0]?.id} className="w-full">
            <TabsList
              className={`grid w-full ${services.length <= 2 ? 'grid-cols-2' : services.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}
            >
              {services.map((svc) => (
                <TabsTrigger key={svc.id} value={svc.id}>
                  {svc.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {services.map((svc) => (
              <TabsContent key={svc.id} value={svc.id} className="px-2">
                <NetworkServiceSettingsPanel
                  relayer={relayer}
                  networkId={networkConfig.id}
                  service={svc}
                  onSettingsChanged={onSettingsChanged}
                />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No network configuration available</p>
              <p className="text-xs mt-1">
                This network uses default settings that cannot be customized
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
