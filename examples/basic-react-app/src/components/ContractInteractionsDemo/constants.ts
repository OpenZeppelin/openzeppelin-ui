/**
 * Code examples for the Learn tab
 */

export const LOAD_CONTRACT_EXAMPLE = `import { useEcosystem } from './context';

function ContractLoader() {
  const { adapter } = useEcosystem();
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadContract = async (address: string) => {
    setLoading(true);
    try {
      // The adapter fetches the contract ABI from block explorers
      // (Etherscan, Sourcify for EVM; Soroban RPC for Stellar)
      const contractSchema = await adapter.loadContract(address);
      setSchema(contractSchema);
    } catch (error) {
      console.error('Failed to load contract:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => loadContract('0x...')}>
        {loading ? 'Loading...' : 'Load Contract'}
      </button>
      {schema && <p>Loaded: {schema.name}</p>}
    </div>
  );
}`;

export const FORM_SCHEMA_EXAMPLE = `// Generate form schema from contract function
function createFormSchema(
  contractAddress: string,
  fn: ContractFunction,
  adapter: ContractAdapter,
  contractSchema: ContractSchema // Needed for enum/struct type resolution
): RenderFormSchema {
  // Pass contractSchema to resolve complex types (enums, structs, etc.)
  const fields = fn.inputs.map((input) => 
    adapter.generateDefaultField(input, contractSchema)
  );

  return {
    id: \`form-\${fn.id}\`,
    title: fn.displayName,
    contractAddress,
    functionId: fn.id,
    fields,
    submitButton: {
      text: fn.modifiesState ? 'Execute' : 'Query',
    },
  };
}`;

export const TRANSACTION_FORM_EXAMPLE = `import { TransactionForm } from '@openzeppelin/ui-renderer';

function ContractTransactionDemo() {
  const { adapter } = useEcosystem();
  const { isConnected } = useDerivedAccountStatus();

  // formSchema defines the form fields and layout
  // contractSchema provides type information for complex types
  return (
    <TransactionForm
      schema={formSchema}
      contractSchema={contractSchema}
      adapter={adapter}
      isWalletConnected={isConnected}
    />
  );
}`;

export const TRANSACTION_EXECUTION_EXAMPLE = `// The TransactionForm handles execution internally, but you can also
// execute transactions directly using the adapter:

async function executeTransaction(
  adapter: ContractAdapter,
  contractAddress: string,
  functionId: string,
  args: unknown[]
) {
  // Prepare the transaction
  const txRequest = await adapter.prepareTransaction({
    contractAddress,
    functionId,
    args,
  });

  // Execute and wait for confirmation
  const result = await adapter.executeTransaction(txRequest);
  
  // Get explorer URL for the transaction
  const explorerUrl = adapter.getExplorerTxUrl?.(result.txHash);
  
  return { result, explorerUrl };
}`;
