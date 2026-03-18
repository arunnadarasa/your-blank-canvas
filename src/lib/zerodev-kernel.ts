import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from '@zerodev/sdk';
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { createPublicClient, http, type Chain, type EIP1193Provider } from 'viem';

export type KernelClientBundle = Awaited<ReturnType<typeof createKernelClientsForChain>>;

/**
 * Build a Kernel smart account + sponsored client using Privy's EIP-1193 provider as owner.
 */
export async function createKernelClientsForChain(
  signer: EIP1193Provider,
  chain: Chain,
  bundlerRpc: string,
  paymasterRpc: string
) {
  const rpcUrl = chain.rpcUrls.default.http[0];
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const entryPoint = getEntryPoint('0.7');

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer,
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  const account = await createKernelAccount(publicClient, {
    plugins: {
      sudo: ecdsaValidator,
    },
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  const paymasterClient = createZeroDevPaymasterClient({
    chain,
    transport: http(paymasterRpc),
  });

  const kernelClient = createKernelAccountClient({
    account,
    chain,
    bundlerTransport: http(bundlerRpc),
    client: publicClient,
    paymaster: {
      getPaymasterData: (userOperation) =>
        paymasterClient.sponsorUserOperation({ userOperation }),
    },
  });

  return { kernelClient, account, publicClient };
}

/**
 * ZeroDev v3 unified RPC (bundler + paymaster on one URL).
 * @see https://dashboard.zerodev.app/ → Project → Chains
 */
export function defaultZeroDevChainRpc(projectId: string, chainId: number): string {
  return `https://rpc.zerodev.app/api/v3/${projectId}/chain/${chainId}`;
}
