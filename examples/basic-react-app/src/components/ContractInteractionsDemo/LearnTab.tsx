import { Eye, FileCode2, Play, Send } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-components';

import { CodeBlock } from '../CodeBlock';
import {
  FORM_SCHEMA_EXAMPLE,
  LOAD_CONTRACT_EXAMPLE,
  TRANSACTION_EXECUTION_EXAMPLE,
  TRANSACTION_FORM_EXAMPLE,
} from './constants';

export function LearnTab(): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Contract Loading Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5" />
            Loading Contracts
          </CardTitle>
          <CardDescription>How to load contract schemas dynamically using adapters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The adapter&apos;s <code>loadContract(address)</code> method fetches the contract ABI
            from block explorers (Etherscan/Sourcify for EVM, Soroban RPC for Stellar). This enables
            dynamic contract interaction without hardcoding ABIs.
          </p>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Key Features</h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Automatic ABI fetching from verified contracts</li>
              <li>Proxy contract detection and implementation resolution</li>
              <li>Multiple provider fallback (Etherscan → Sourcify)</li>
              <li>Contract verification status reporting</li>
              <li>Ecosystem-agnostic via adapter pattern</li>
            </ul>
          </div>
          <CodeBlock code={LOAD_CONTRACT_EXAMPLE} language="tsx" />
        </CardContent>
      </Card>

      {/* Form Schema Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Dynamic Form Generation
          </CardTitle>
          <CardDescription>
            Generate form schemas from contract functions automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Once a contract is loaded, you can generate form schemas from its functions using{' '}
            <code>adapter.generateDefaultField()</code>. This creates appropriate input fields based
            on parameter types (addresses, amounts, bytes, etc.).
          </p>
          <CodeBlock code={FORM_SCHEMA_EXAMPLE} language="tsx" />
        </CardContent>
      </Card>

      {/* Transaction Form & Execution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Transaction Form & Execution
          </CardTitle>
          <CardDescription>
            Execute contract transactions with automatic form generation and wallet integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The <code>TransactionForm</code> component renders a dynamic form based on the form
            schema, handles wallet connection state, and executes transactions through the adapter.
          </p>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Features</h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Dynamic form rendering based on function parameters</li>
              <li>Support for complex types (structs, enums, arrays, bytes)</li>
              <li>Wallet connection state management</li>
              <li>Transaction status tracking and error handling</li>
              <li>Explorer links for submitted transactions</li>
            </ul>
          </div>
          <CodeBlock code={TRANSACTION_FORM_EXAMPLE} language="tsx" />

          <div className="space-y-2 pt-4">
            <h4 className="text-sm font-medium">Direct Transaction Execution</h4>
            <p className="text-sm text-muted-foreground">
              For more control, you can execute transactions directly using the adapter&apos;s{' '}
              <code>prepareTransaction</code> and <code>executeTransaction</code> methods.
            </p>
          </div>
          <CodeBlock code={TRANSACTION_EXECUTION_EXAMPLE} language="tsx" />
        </CardContent>
      </Card>

      {/* ContractStateWidget Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            ContractStateWidget
          </CardTitle>
          <CardDescription>
            Displays contract state by querying view functions with no parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The <code>ContractStateWidget</code> automatically identifies view functions in the
            loaded contract schema that have no input parameters and queries them to display the
            current contract state.
          </p>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Features</h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Automatic discovery of parameterless view functions</li>
              <li>Rate-limited batch queries to avoid RPC rate limits</li>
              <li>Real-time refresh capability</li>
              <li>Result formatting via adapter.formatFunctionResult()</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
