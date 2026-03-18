import {
  type Address,
  type Hash,
  type PublicClient,
  getContractAddress,
  type Abi,
} from 'viem';
import type { KernelClientBundle } from '@/lib/zerodev-kernel';

const MAX_CREATE_NONCE_SCAN = 250n;

/** All child contract addresses already deployed from this Kernel (CREATE nonce scan). */
export async function snapshotKernelChildAddresses(
  publicClient: PublicClient,
  kernelAddr: Address
): Promise<Set<string>> {
  const s = new Set<string>();
  for (let n = 0n; n < MAX_CREATE_NONCE_SCAN; n++) {
    const addr = getContractAddress({ from: kernelAddr, nonce: n });
    const code = await publicClient.getCode({ address: addr });
    if (code && code !== '0x' && code.length > 4) {
      s.add(addr.toLowerCase());
    }
  }
  return s;
}

/**
 * Deploy a contract via Kernel UserOp (ZeroDev paymaster).
 * Resolves the new contract address by scanning CREATE nonces from the smart account.
 */
export async function deployContractViaKernel(
  bundle: KernelClientBundle,
  params: {
    abi: Abi | readonly unknown[];
    bytecode: `0x${string}`;
    args?: readonly unknown[];
  },
  /** Lowercase addresses of contracts already attributed to this kernel (children). */
  deployedChildAddresses: Set<string>
): Promise<{ address: Address; txHash: Hash }> {
  const { kernelClient, account, publicClient } = bundle;
  const kernelAddr = account.address;

  const createNonceBefore = await publicClient.getTransactionCount({
    address: kernelAddr,
  });
  const predicted = getContractAddress({
    from: kernelAddr,
    nonce: BigInt(createNonceBefore),
  });

  const callData = await account.encodeDeployCallData({
    abi: params.abi as Abi,
    bytecode: params.bytecode,
    args: (params.args ?? []) as never,
  });

  const txHash = (await kernelClient.sendTransaction({
    callData,
  } as Parameters<typeof kernelClient.sendTransaction>[0])) as Hash;

  await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 180_000,
  });

  // Poll bytecode (RPC lag after bundle lands)
  const tryPredicted = async (addr: Address): Promise<boolean> => {
    for (let i = 0; i < 12; i++) {
      const code = await publicClient.getCode({ address: addr });
      if (code && code !== '0x' && code.length > 4) return true;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
    return false;
  };
  if (
    !deployedChildAddresses.has(predicted.toLowerCase()) &&
    (await tryPredicted(predicted))
  ) {
    deployedChildAddresses.add(predicted.toLowerCase());
    return { address: predicted, txHash };
  }

  for (let n = 0n; n < MAX_CREATE_NONCE_SCAN; n++) {
    const addr = getContractAddress({ from: kernelAddr, nonce: n });
    const key = addr.toLowerCase();
    if (deployedChildAddresses.has(key)) continue;
    if (await tryPredicted(addr)) {
      deployedChildAddresses.add(key);
      return { address: addr, txHash };
    }
  }

  throw new Error(
    'Could not resolve deployed contract address. Confirm ZeroDev sponsors deployments on this chain.'
  );
}
