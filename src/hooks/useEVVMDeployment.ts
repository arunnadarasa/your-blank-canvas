import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  deployEVVMContractsViaKernel,
  type DeploymentConfig,
  type DeploymentProgress,
  type ContractAddresses,
} from '@/lib/contracts/deployment';
import { hasBytecodes } from '@/lib/contracts/bytecodes';
import {
  saveDeployment,
  generateId,
  type DeploymentRecord,
} from '@/lib/storage';
import { getChainName } from '@/lib/wagmi';
import { useZeroDevKernel } from '@/contexts/ZeroDevKernelContext';
import { baseSepolia } from 'wagmi/chains';

export function useEVVMDeployment() {
  const [deploying, setDeploying] = useState(false);
  const [progress, setProgress] = useState<DeploymentProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const {
    kernelBundleBase,
    kernelBundleSepolia,
    kernelDeployReady,
    kernelError,
    kernelSepoliaError,
  } = useZeroDevKernel();

  const canDeploy =
    !!isConnected &&
    !!address &&
    kernelDeployReady &&
    hasBytecodes();

  const deploy = useCallback(
    async (config: DeploymentConfig): Promise<DeploymentRecord | null> => {
      if (!kernelBundleBase || !kernelBundleSepolia) {
        setError(
          kernelSepoliaError ??
            kernelError ??
            'ZeroDev Kernel not ready on Base Sepolia and Ethereum Sepolia.'
        );
        return null;
      }

      setDeploying(true);
      setError(null);

      const deploymentId = generateId();
      const record: DeploymentRecord = {
        id: deploymentId,
        createdAt: new Date().toISOString(),
        evvmName: config.evvmName,
        principalTokenName: config.principalTokenName,
        principalTokenSymbol: config.principalTokenSymbol,
        hostChainId: baseSepolia.id,
        hostChainName: getChainName(baseSepolia.id),
        adminAddress: config.adminAddress,
        goldenFisherAddress: config.goldenFisherAddress,
        activatorAddress: config.activatorAddress,
        deploymentStatus: 'deploying',
        currentStep: 0,
        txHashes: {},
        totalSupply: config.totalSupply.toString(),
        eraTokens: config.eraTokens.toString(),
        rewardPerOperation: config.rewardPerOperation.toString(),
      };

      saveDeployment(record);

      try {
        const addresses: ContractAddresses = await deployEVVMContractsViaKernel(
          kernelBundleBase,
          kernelBundleSepolia,
          config,
          (p) => {
            setProgress(p);
            record.currentStep = p.step;
            if (p.txHash) {
              record.txHashes[p.stage] = p.txHash;
            }
            saveDeployment(record);
          }
        );

        record.stakingAddress = addresses.staking;
        record.evvmCoreAddress = addresses.evvmCore;
        record.nameServiceAddress = addresses.nameService;
        record.estimatorAddress = addresses.estimator;
        record.treasuryAddress = addresses.treasury;
        record.p2pSwapAddress = addresses.p2pSwap;
        if (addresses.evvmId !== undefined) {
          record.evvmId = Number(addresses.evvmId);
        }
        record.deploymentStatus = 'completed';
        record.currentStep = 7;
        saveDeployment(record);

        setProgress({
          stage: 'complete',
          message: 'Deployment complete (ZeroDev sponsored)!',
          step: 7,
          totalSteps: 7,
        });

        return record;
      } catch (err: unknown) {
        record.deploymentStatus = 'failed';
        saveDeployment(record);
        const msg = err instanceof Error ? err.message : 'Deployment failed';
        setError(msg);
        setProgress({
          stage: 'failed',
          message: msg,
          step: record.currentStep,
          totalSteps: 7,
        });
        return null;
      } finally {
        setDeploying(false);
      }
    },
    [kernelBundleBase, kernelBundleSepolia, kernelError, kernelSepoliaError]
  );

  return {
    deploying,
    progress,
    error,
    canDeploy,
    deploy,
    kernelDeployReady,
    kernelSepoliaError,
    kernelError,
  };
}
