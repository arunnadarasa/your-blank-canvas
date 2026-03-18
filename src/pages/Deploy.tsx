import { useState } from 'react';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DeploymentStepCard } from '@/components/DeploymentStepCard';
import { ManifestCard } from '@/components/ManifestCard';
import { NetworkBadge } from '@/components/NetworkBadge';
import { useEVVMDeployment } from '@/hooks/useEVVMDeployment';
import { hasBytecodes } from '@/lib/contracts/bytecodes';
import type { StepStatus } from '@/components/StatusCircle';
import type { DeploymentRecord } from '@/lib/storage';
import { AlertTriangle, Rocket, Info } from 'lucide-react';

const DEPLOYMENT_STEPS = [
  { title: 'Staking', description: 'Deploy Staking contract (no dependencies)' },
  { title: 'EVVM Core', description: 'Deploy Core contract (requires Staking)' },
  { title: 'NameService', description: 'Deploy NameService (requires Core)' },
  { title: 'Estimator', description: 'Deploy Estimator (requires Core + Staking)' },
  { title: 'Treasury', description: 'Deploy Treasury (requires Core)' },
  { title: 'P2PSwap', description: 'Deploy P2PSwap (requires Core + Staking)' },
  { title: 'Register', description: 'Register EVVM on Ethereum Sepolia registry' },
];

type Phase = 'configure' | 'deploy' | 'complete';

export default function Deploy() {
  const { login } = usePrivy();
  const { address, isConnected, chain } = useAccount();
  const {
    deploying,
    progress,
    error,
    deploy,
    canDeploy,
    kernelDeployReady,
    kernelSepoliaError,
    kernelError,
  } = useEVVMDeployment();
  const [phase, setPhase] = useState<Phase>('configure');
  const [completedDeployment, setCompletedDeployment] = useState<DeploymentRecord | null>(null);
  const bytesReady = hasBytecodes();

  // Form state
  const [evvmName, setEvvmName] = useState('');
  const [tokenName, setTokenName] = useState('MATE');
  const [tokenSymbol, setTokenSymbol] = useState('MATE');
  const [adminAddr, setAdminAddr] = useState('');
  const [goldenFisher, setGoldenFisher] = useState('');
  const [activator, setActivator] = useState('');

  // Auto-fill connected address
  const fillAddress = () => {
    if (address) {
      if (!adminAddr) setAdminAddr(address);
      if (!goldenFisher) setGoldenFisher(address);
      if (!activator) setActivator(address);
    }
  };

  const handleDeploy = async () => {
    if (!address) return;
    setPhase('deploy');

    const result = await deploy({
      adminAddress: (adminAddr || address) as `0x${string}`,
      goldenFisherAddress: (goldenFisher || address) as `0x${string}`,
      activatorAddress: (activator || address) as `0x${string}`,
      evvmName,
      principalTokenName: tokenName,
      principalTokenSymbol: tokenSymbol,
      totalSupply: BigInt(0),
      eraTokens: BigInt(0),
      rewardPerOperation: BigInt(0),
    });

    if (result) {
      setCompletedDeployment(result);
      setPhase('complete');
    }
  };

  const getStepStatus = (stepIndex: number): StepStatus => {
    if (!progress) return 'pending';
    const currentStep = progress.step;
    if (stepIndex + 1 < currentStep) return 'completed';
    if (stepIndex + 1 === currentStep) {
      if (progress.stage === 'failed') return 'failed';
      return 'active';
    }
    return 'pending';
  };

  if (!isConnected) {
    return (
      <main className="container max-w-lg px-4 py-16 text-center">
        <Rocket className="h-8 w-8 text-primary mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Log in to Deploy</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sign in with Privy (email, Google, or wallet) to deploy on Base Sepolia.
        </p>
        <Button onClick={() => login()}>Log in</Button>
      </main>
    );
  }

  return (
    <main className="container max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold">Deploy EVVM Instance</h1>
          <p className="text-xs text-muted-foreground">7-step deployment + registry wizard</p>
        </div>
        {chain && <NetworkBadge chainId={chain.id} />}
      </div>

      {isConnected && !kernelDeployReady && (kernelSepoliaError || kernelError) && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 mb-6 flex gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-destructive">ZeroDev Kernel not ready</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {kernelSepoliaError || kernelError} Enable <strong>Ethereum Sepolia</strong> and{' '}
              <strong>Base Sepolia</strong> for your ZeroDev project, then refresh.
            </p>
          </div>
        </div>
      )}

      {!bytesReady && (
        <div className="rounded-md border border-warning/30 bg-warning/5 p-3 mb-6 flex gap-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-warning">Bytecodes Not Configured</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Contract bytecodes must be compiled from <code className="font-mono text-foreground">@evvm/testnet-contracts</code> using Foundry.
              Update <code className="font-mono text-foreground">src/lib/contracts/bytecodes.ts</code> with compiled output, or use the EVVM CLI: <code className="font-mono text-foreground">npx @evvm/testnet-contracts evvm deploy</code>
            </p>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Configuration Phase */}
        {phase === 'configure' && (
          <motion.div
            key="configure"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm">Configuration</CardTitle>
                <CardDescription className="text-xs">Set up your EVVM instance parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">EVVM Instance Name</Label>
                  <Input
                    value={evvmName}
                    onChange={(e) => setEvvmName(e.target.value)}
                    placeholder="my-evvm-instance"
                    className="mt-1 h-9 text-sm font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Token Name</Label>
                    <Input
                      value={tokenName}
                      onChange={(e) => setTokenName(e.target.value)}
                      placeholder="MATE"
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Token Symbol</Label>
                    <Input
                      value={tokenSymbol}
                      onChange={(e) => setTokenSymbol(e.target.value)}
                      placeholder="MATE"
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Addresses</Label>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={fillAddress}>
                      Use Connected Wallet
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Admin Address</Label>
                      <Input
                        value={adminAddr}
                        onChange={(e) => setAdminAddr(e.target.value)}
                        placeholder={address}
                        className="mt-0.5 h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Golden Fisher Address</Label>
                      <Input
                        value={goldenFisher}
                        onChange={(e) => setGoldenFisher(e.target.value)}
                        placeholder={address}
                        className="mt-0.5 h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Activator Address</Label>
                      <Input
                        value={activator}
                        onChange={(e) => setActivator(e.target.value)}
                        placeholder={address}
                        className="mt-0.5 h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-md bg-muted/50 border border-border p-2">
                  <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <p className="text-[10px] text-muted-foreground">
                    Contracts deploy via your <strong>ZeroDev smart account</strong> on Base Sepolia (sponsored
                    UserOps). Registry registration uses a separate Kernel on <strong>Ethereum Sepolia</strong>{' '}
                    (also sponsored). No ETH required in your EOA for gas if paymaster policies allow it.
                  </p>
                </div>

                <Button
                  onClick={handleDeploy}
                  disabled={!evvmName || deploying || !bytesReady || !canDeploy}
                  className="w-full h-9 text-sm glow-primary"
                >
                  <Rocket className="h-3.5 w-3.5" />
                  Deploy via ZeroDev (6 + registry)
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Deployment Phase */}
        {phase === 'deploy' && (
          <motion.div
            key="deploy"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {DEPLOYMENT_STEPS.map((step, i) => (
              <DeploymentStepCard
                key={i}
                step={i + 1}
                title={step.title}
                description={step.description}
                status={getStepStatus(i)}
                chainId={chain?.id || 84532}
                txHash={progress?.step === i + 1 ? progress.txHash : undefined}
              />
            ))}

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 mt-4">
                <p className="text-xs text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => setPhase('configure')}
                >
                  Back to Configuration
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Complete Phase */}
        {phase === 'complete' && completedDeployment && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <ManifestCard deployment={completedDeployment} />
            <Button
              variant="outline"
              className="w-full mt-4 h-9 text-sm"
              onClick={() => {
                setPhase('configure');
                setCompletedDeployment(null);
              }}
            >
              Deploy Another Instance
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
