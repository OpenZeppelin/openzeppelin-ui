import { Eye, Send } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-components';
import { WalletConnectionUI } from '@openzeppelin/ui-react';
import { TransactionForm } from '@openzeppelin/ui-renderer';
import type {
  ContractFunction,
  ContractSchema,
  RenderFormSchema,
  TransactionFormCapabilities,
} from '@openzeppelin/ui-types';

interface ExecuteTransactionCardProps {
  writableFunctions: ContractFunction[];
  selectedFunctionId: string | null;
  onSelectFunction: (id: string) => void;
  showAllFunctions: boolean;
  onToggleShowAll: () => void;
  formSchema: RenderFormSchema | null;
  contractSchema: ContractSchema;
  capabilities: TransactionFormCapabilities;
  isConnected: boolean;
  isWidgetVisible: boolean;
  onShowWidget: () => void;
}

export function ExecuteTransactionCard({
  writableFunctions,
  selectedFunctionId,
  onSelectFunction,
  showAllFunctions,
  onToggleShowAll,
  formSchema,
  contractSchema,
  capabilities,
  isConnected,
  isWidgetVisible,
  onShowWidget,
}: ExecuteTransactionCardProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" />
            Execute Transaction
          </CardTitle>
          {!isWidgetVisible && (
            <Button variant="ghost" size="sm" onClick={onShowWidget} className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Show State
            </Button>
          )}
        </div>
        <CardDescription>
          Select a function and fill in the form to execute a transaction
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Wallet Connection */}
        <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/30 p-3">
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Wallet connected' : 'Connect wallet to execute'}
          </span>
          <WalletConnectionUI />
        </div>

        {/* Function Selector */}
        {writableFunctions.length > 0 ? (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Select Function ({writableFunctions.length} available)
              </label>
              <div className="flex flex-wrap gap-2">
                {(showAllFunctions ? writableFunctions : writableFunctions.slice(0, 6)).map(
                  (fn) => (
                    <Button
                      key={fn.id}
                      variant={selectedFunctionId === fn.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onSelectFunction(fn.id)}
                    >
                      {fn.displayName || fn.name}
                    </Button>
                  )
                )}
                {writableFunctions.length > 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleShowAll}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {showAllFunctions ? 'Show less' : `+${writableFunctions.length - 6} more`}
                  </Button>
                )}
              </div>
            </div>

            {/* Transaction Form */}
            {formSchema && (
              <TransactionForm
                schema={formSchema}
                contractSchema={contractSchema}
                adapter={capabilities}
                isWalletConnected={isConnected}
              />
            )}
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>No writable functions found in this contract.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
