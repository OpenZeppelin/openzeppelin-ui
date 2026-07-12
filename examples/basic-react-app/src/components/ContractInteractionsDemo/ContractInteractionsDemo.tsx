/**
 * Contract Interactions Demo
 *
 * Demonstrates reading contract state and executing transactions
 * using the OpenZeppelin UI components across different ecosystems.
 */

import { AlertCircle, BookOpen, Loader2, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openzeppelin/ui-components';
import { useDerivedAccountStatus } from '@openzeppelin/ui-react';
import { ContractStateWidget } from '@openzeppelin/ui-renderer';

import { useEcosystem } from '../../context';
import {
  getDemoContractAddress,
  isDemoContractDeployed,
  type DemoEcosystem,
} from '../../core/ecosystemManager';
import { toTransactionFormCapabilities } from '../../core/runtimeCapabilities';
import { DemoSection } from '../DemoSection';
import { NetworkRequirementHint } from '../NetworkRequirementHint';
import { NetworkSwitcher } from '../NetworkSwitcher';
import { ContractLoadingCard } from './ContractLoadingCard';
import { ExecuteTransactionCard } from './ExecuteTransactionCard';
import { LearnTab } from './LearnTab';
import type { DemoTab } from './types';
import { useContractLoader } from './useContractLoader';
import { createFormSchemaFromFunction, getWritableFunctions } from './utils';

export function ContractInteractionsDemo(): React.ReactElement {
  const { capabilities, ecosystem, isLoading, metadata, network, runtime } = useEcosystem();
  const { isConnected } = useDerivedAccountStatus();

  const [activeTab, setActiveTab] = useState<DemoTab>('try-it');
  const [isWidgetVisible, setIsWidgetVisible] = useState(true);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [showAllFunctions, setShowAllFunctions] = useState(false);

  // Get contract address and deployment status for current ecosystem
  const contractAddress = useMemo(() => {
    return getDemoContractAddress(ecosystem as DemoEcosystem);
  }, [ecosystem]);

  const isDeployed = useMemo(() => {
    return isDemoContractDeployed(ecosystem as DemoEcosystem);
  }, [ecosystem]);

  // Get explorer URL from the runtime's explorer capability.
  const explorerUrl = useMemo(() => {
    return capabilities?.getExplorerUrl(contractAddress) ?? undefined;
  }, [capabilities, contractAddress]);

  // Load contract
  const { contractState, loadContract } = useContractLoader({
    contractLoading: capabilities,
    contractAddress,
    isDeployed,
  });

  // Reset selected function and expanded state when schema changes
  useEffect(() => {
    setShowAllFunctions(false);
    if (contractState.schema) {
      const writables = getWritableFunctions(contractState.schema);
      if (writables.length > 0) {
        const defaultFn =
          writables.find((fn) => fn.name === 'setGreeting') ||
          writables.find((fn) => fn.name === 'stake') ||
          writables[0];
        setSelectedFunctionId(defaultFn.id);
      } else {
        setSelectedFunctionId(null);
      }
    } else {
      setSelectedFunctionId(null);
    }
  }, [contractState.schema]);

  // Get available writable functions
  const writableFunctions = useMemo(() => {
    if (!contractState.schema) return [];
    return getWritableFunctions(contractState.schema);
  }, [contractState.schema]);

  // Get selected function details
  const selectedFunction = useMemo(() => {
    if (!contractState.schema || !selectedFunctionId) return null;
    return contractState.schema.functions.find((fn) => fn.id === selectedFunctionId) || null;
  }, [contractState.schema, selectedFunctionId]);

  // Generate form schema for selected function
  const formSchema = useMemo(() => {
    if (!selectedFunction || !capabilities || !contractState.schema) return null;
    return createFormSchemaFromFunction(
      contractAddress,
      selectedFunction,
      capabilities,
      contractState.schema
    );
  }, [selectedFunction, capabilities, contractAddress, contractState.schema]);

  const transactionCapabilities = useMemo(() => toTransactionFormCapabilities(runtime), [runtime]);

  // Show loading state while the runtime is loading
  if (isLoading || !capabilities || !runtime || !transactionCapabilities) {
    return (
      <DemoSection
        title="Contract Interactions"
        description="Demonstrate reading contract state and executing transactions"
      >
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Loading runtime...</span>
          </CardContent>
        </Card>
      </DemoSection>
    );
  }

  return (
    <DemoSection
      title="Contract Interactions"
      description="Demonstrate reading contract state and executing transactions using the active runtime and UI components."
    >
      {/* Network Switcher */}
      <div className="mb-6 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
        <span className="text-sm text-muted-foreground">Select network:</span>
        <NetworkSwitcher />
      </div>

      {/* Wrong-network warning: the demo contract only exists on the ecosystem's
          default network (EVM → Sepolia), so it 404s elsewhere. */}
      <NetworkRequirementHint requiredNetworkId={metadata?.defaultNetworkId} className="mb-6">
        The demo contract is deployed on{' '}
        <span className="font-medium">
          {metadata?.defaultNetwork.name ?? 'the default network'}
        </span>
        . Switch the network selector to it — other networks return a “contract not found” (404)
        error.
      </NetworkRequirementHint>

      {/* Contract Loading Status Card */}
      <ContractLoadingCard
        contractState={contractState}
        contractAddress={contractAddress}
        explorerUrl={explorerUrl}
        networkName={network?.name ?? 'Unknown'}
        ecosystem={ecosystem}
        isDeployed={isDeployed}
        onReload={() => void loadContract()}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DemoTab)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="try-it" className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Try It
          </TabsTrigger>
          <TabsTrigger value="learn" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Learn
          </TabsTrigger>
        </TabsList>

        {/* Try It Tab */}
        <TabsContent value="try-it" className="mt-6 space-y-6">
          {contractState.status !== 'success' || !contractState.schema ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {contractState.status === 'loading'
                  ? 'Loading contract...'
                  : contractState.status === 'error'
                    ? contractState.error
                    : 'Load the contract to interact with it.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className={`flex ${isWidgetVisible ? 'gap-6' : 'gap-0'}`}>
              {/* Contract State Widget */}
              <div
                className={`transition-all ${isWidgetVisible ? 'w-80 shrink-0' : 'w-0 overflow-hidden'}`}
              >
                <div className="sticky top-4">
                  <ContractStateWidget
                    contractSchema={contractState.schema}
                    contractAddress={contractAddress}
                    query={capabilities}
                    schema={capabilities}
                    isVisible={isWidgetVisible}
                    onToggle={() => setIsWidgetVisible(!isWidgetVisible)}
                  />
                </div>
              </div>

              {/* Transaction Form */}
              <div className="min-w-0 flex-1">
                <ExecuteTransactionCard
                  writableFunctions={writableFunctions}
                  selectedFunctionId={selectedFunctionId}
                  onSelectFunction={setSelectedFunctionId}
                  showAllFunctions={showAllFunctions}
                  onToggleShowAll={() => setShowAllFunctions(!showAllFunctions)}
                  formSchema={formSchema}
                  contractSchema={contractState.schema}
                  capabilities={transactionCapabilities}
                  isConnected={isConnected}
                  isWidgetVisible={isWidgetVisible}
                  onShowWidget={() => setIsWidgetVisible(true)}
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Learn Tab */}
        <TabsContent value="learn" className="mt-6">
          <LearnTab />
        </TabsContent>
      </Tabs>
    </DemoSection>
  );
}
