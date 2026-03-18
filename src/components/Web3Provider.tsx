import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { baseSepolia, sepolia } from 'wagmi/chains';
import { config } from '@/lib/wagmi';
import { ZeroDevKernelProvider } from '@/contexts/ZeroDevKernelContext';

const queryClient = new QueryClient();

/** Fallback so the app mounts without a black screen if .env is missing (override in .env for production). */
const appId =
  import.meta.env.VITE_PRIVY_APP_ID?.trim() || 'cmmv0z6dv06bs0djs07c7vrl3';

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia, sepolia],
        loginMethods: ['email', 'google', 'wallet', 'discord'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <ZeroDevKernelProvider>{children}</ZeroDevKernelProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
