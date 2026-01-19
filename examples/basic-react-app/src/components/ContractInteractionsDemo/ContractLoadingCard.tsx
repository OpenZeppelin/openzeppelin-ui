import { AlertCircle, CheckCircle2, FileCode2, Loader2, RefreshCw } from 'lucide-react';

import {
  AddressDisplay,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-components';

import type { ContractLoadState } from './types';

interface ContractLoadingCardProps {
  contractState: ContractLoadState;
  contractAddress: string;
  explorerUrl?: string;
  networkName: string;
  ecosystem: string;
  isDeployed: boolean;
  onReload: () => void;
}

export function ContractLoadingCard({
  contractState,
  contractAddress,
  explorerUrl,
  networkName,
  ecosystem,
  isDeployed,
  onReload,
}: ContractLoadingCardProps): React.ReactElement {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileCode2 className="h-5 w-5" />
            Contract Loading
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReload}
            disabled={contractState.status === 'loading' || !isDeployed}
            className="gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${contractState.status === 'loading' ? 'animate-spin' : ''}`}
            />
            Reload
          </Button>
        </div>
        <CardDescription>
          Uses <code>adapter.loadContract(address)</code> to fetch the contract ABI from block
          explorers
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Contract Info */}
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Network</p>
            <p className="text-sm">{networkName}</p>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">Contract Address</p>
            <AddressDisplay
              address={contractAddress}
              truncate={true}
              startChars={10}
              endChars={8}
              showCopyButton={true}
              explorerUrl={explorerUrl}
            />
          </div>
        </div>

        {/* Loading Status */}
        <div className="rounded-lg border bg-muted/30 p-4">
          {contractState.status === 'idle' && !isDeployed && (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                Stellar contract not deployed. Please deploy the contract first.
              </span>
            </div>
          )}

          {contractState.status === 'loading' && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm">
                Fetching contract ABI from{' '}
                {ecosystem === 'evm' ? 'Etherscan/Sourcify' : 'Soroban RPC'}...
              </span>
            </div>
          )}

          {contractState.status === 'success' && contractState.schema && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Contract loaded successfully</span>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Name:</span>{' '}
                  <span className="font-medium">
                    {contractState.metadata?.contractName || contractState.schema.name || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Functions:</span>{' '}
                  <span className="font-medium">{contractState.schema.functions.length}</span>
                </div>
                {contractState.metadata?.verificationStatus && (
                  <div>
                    <span className="text-muted-foreground">Status:</span>{' '}
                    <span className="font-medium capitalize">
                      {contractState.metadata.verificationStatus}
                    </span>
                  </div>
                )}
              </div>
              {contractState.metadata?.fetchedFrom && (
                <div className="text-xs text-muted-foreground">
                  Source:{' '}
                  <a
                    href={contractState.metadata.fetchedFrom}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    {contractState.metadata.fetchedFrom}
                  </a>
                </div>
              )}
            </div>
          )}

          {contractState.status === 'error' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Failed to load contract</span>
              </div>
              <p className="text-sm text-muted-foreground">{contractState.error}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
