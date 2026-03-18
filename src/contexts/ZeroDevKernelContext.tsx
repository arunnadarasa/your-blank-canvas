import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { baseSepolia, sepolia } from 'wagmi/chains';
import { zeroAddress } from 'viem';
import {
  createKernelClientsForChain,
  defaultZeroDevChainRpc,
  type KernelClientBundle,
} from '@/lib/zerodev-kernel';

const PROJECT_ID = import.meta.env.VITE_ZERODEV_PROJECT_ID ?? '92691254-2986-488c-9c5d-b6028a3deb3a';

/** Bundler + paymaster URLs; v3 dashboard uses one URL for both. */
function bundlerAndPaymasterForChain(chainId: number): { bundler: string; paymaster: string } {
  const unified = defaultZeroDevChainRpc(PROJECT_ID, chainId);
  if (chainId === baseSepolia.id) {
    const bundler = import.meta.env.VITE_ZERODEV_RPC?.trim() || unified;
    const paymaster =
      import.meta.env.VITE_ZERODEV_PAYMASTER_RPC?.trim() || bundler;
    return { bundler, paymaster };
  }
  if (chainId === sepolia.id) {
    const bundler = import.meta.env.VITE_ZERODEV_RPC_SEPOLIA?.trim() || unified;
    const paymaster =
      import.meta.env.VITE_ZERODEV_PAYMASTER_RPC_SEPOLIA?.trim() || bundler;
    return { bundler, paymaster };
  }
  return { bundler: unified, paymaster: unified };
}

type ZeroDevKernelState = {
  smartAccountAddress: `0x${string}` | null;
  smartAccountAddressSepolia: `0x${string}` | null;
  kernelClient: KernelClientBundle['kernelClient'] | null;
  kernelBundleBase: KernelClientBundle | null;
  kernelBundleSepolia: KernelClientBundle | null;
  /** Both Base + Sepolia Kernel clients ready (required for full deploy via ZeroDev). */
  kernelDeployReady: boolean;
  /** Base Sepolia Kernel ready (e.g. test sponsorship). */
  kernelReady: boolean;
  kernelError: string | null;
  kernelSepoliaError: string | null;
  sendTestSponsoredUserOp: () => Promise<string | null>;
  sponsoring: boolean;
};

const ZeroDevKernelContext = createContext<ZeroDevKernelState | null>(null);

export function ZeroDevKernelProvider({ children }: { children: ReactNode }) {
  const { authenticated, ready: privyReady } = usePrivy();
  const { wallets } = useWallets();
  const [bundleBase, setBundleBase] = useState<KernelClientBundle | null>(null);
  const [bundleSepolia, setBundleSepolia] = useState<KernelClientBundle | null>(null);
  const [kernelError, setKernelError] = useState<string | null>(null);
  const [kernelSepoliaError, setKernelSepoliaError] = useState<string | null>(null);
  const [sponsoring, setSponsoring] = useState(false);

  useEffect(() => {
    if (!privyReady || !authenticated) {
      setBundleBase(null);
      setBundleSepolia(null);
      setKernelError(null);
      setKernelSepoliaError(null);
      return;
    }

    const embedded = wallets.find((w) => w.walletClientType === 'privy');
    if (!embedded) {
      setBundleBase(null);
      setBundleSepolia(null);
      setKernelError(null);
      setKernelSepoliaError(null);
      return;
    }

    let cancelled = false;
    setKernelError(null);
    setKernelSepoliaError(null);

    (async () => {
      try {
        const provider = await embedded.getEthereumProvider();
        if (cancelled) return;

        let sepoliaErr: string | null = null;
        const baseRpc = bundlerAndPaymasterForChain(baseSepolia.id);
        const sepRpc = bundlerAndPaymasterForChain(sepolia.id);
        const [bBase, bSep] = await Promise.all([
          createKernelClientsForChain(
            provider,
            baseSepolia,
            baseRpc.bundler,
            baseRpc.paymaster
          ),
          createKernelClientsForChain(provider, sepolia, sepRpc.bundler, sepRpc.paymaster).catch(
            (e: unknown) => {
              sepoliaErr =
                e instanceof Error
                  ? e.message
                  : 'Sepolia Kernel failed — enable Ethereum Sepolia in ZeroDev dashboard.';
              return null;
            }
          ),
        ]);

        if (cancelled) return;
        setBundleBase(bBase);
        if (bSep) {
          setBundleSepolia(bSep);
          setKernelSepoliaError(null);
        } else {
          setBundleSepolia(null);
          setKernelSepoliaError(sepoliaErr ?? 'Sepolia Kernel unavailable');
        }
      } catch (e) {
        if (!cancelled) {
          setBundleBase(null);
          setBundleSepolia(null);
          setKernelError(e instanceof Error ? e.message : 'Failed to init ZeroDev kernel');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [privyReady, authenticated, wallets]);

  const sendTestSponsoredUserOp = useCallback(async () => {
    if (!bundleBase) return null;
    setSponsoring(true);
    try {
      const userOpHash = await bundleBase.kernelClient.sendUserOperation({
        callData: await bundleBase.account.encodeCalls([
          { to: zeroAddress, value: 0n, data: '0x' },
        ]),
      });
      await bundleBase.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
      return userOpHash;
    } finally {
      setSponsoring(false);
    }
  }, [bundleBase]);

  const kernelDeployReady = !!(bundleBase && bundleSepolia);

  const value = useMemo<ZeroDevKernelState>(
    () => ({
      smartAccountAddress: bundleBase?.account.address ?? null,
      smartAccountAddressSepolia: bundleSepolia?.account.address ?? null,
      kernelClient: bundleBase?.kernelClient ?? null,
      kernelBundleBase: bundleBase,
      kernelBundleSepolia: bundleSepolia,
      kernelDeployReady,
      kernelReady: !!bundleBase,
      kernelError,
      kernelSepoliaError: bundleSepolia ? null : kernelSepoliaError,
      sendTestSponsoredUserOp,
      sponsoring,
    }),
    [
      bundleBase,
      bundleSepolia,
      kernelDeployReady,
      kernelError,
      kernelSepoliaError,
      sendTestSponsoredUserOp,
      sponsoring,
    ]
  );

  return (
    <ZeroDevKernelContext.Provider value={value}>{children}</ZeroDevKernelContext.Provider>
  );
}

export function useZeroDevKernel() {
  const ctx = useContext(ZeroDevKernelContext);
  if (!ctx) {
    throw new Error('useZeroDevKernel must be used within ZeroDevKernelProvider');
  }
  return ctx;
}
