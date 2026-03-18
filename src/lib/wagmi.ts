import { http } from 'wagmi';
import { createConfig } from '@privy-io/wagmi';
import { baseSepolia, sepolia } from 'wagmi/chains';

export const config = createConfig({
  chains: [baseSepolia, sepolia],
  transports: {
    [baseSepolia.id]: http(),
    [sepolia.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}

export const SUPPORTED_CHAINS = {
  BASE_SEPOLIA: baseSepolia,
  SEPOLIA: sepolia,
} as const;

export const getExplorerUrl = (chainId: number, hash: string, type: 'tx' | 'address' = 'tx'): string => {
  const explorers: Record<number, string> = {
    84532: `https://sepolia.basescan.org/${type}/${hash}`,
    11155111: `https://sepolia.etherscan.io/${type}/${hash}`,
  };
  return explorers[chainId] || '#';
};

export const getChainName = (chainId: number): string => {
  const names: Record<number, string> = {
    84532: 'Base Sepolia',
    11155111: 'Sepolia',
  };
  return names[chainId] || 'Unknown';
};
