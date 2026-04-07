import { getAddress, parseEther } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';

interface DemoAccountSetupProps {
  createAccount: () => Promise<unknown>;
}

export function DemoAccountSetup({ createAccount }: DemoAccountSetupProps) {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const predictedAddress = walletClient
    ? getAddress(walletClient.account.address)
    : '0x0000000000000000000000000000000000000000';

  return (
    <section>
      <h2>Account Setup</h2>
      <p>Predicted address: {predictedAddress}</p>
      <p>Funding amount: {parseEther('0.005').toString()}</p>
      <button disabled={!publicClient} onClick={() => void createAccount()}>
        Create smart account
      </button>
    </section>
  );
}
