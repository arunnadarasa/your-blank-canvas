import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useZeroDevKernel } from '@/contexts/ZeroDevKernelContext';
import { Copy, Loader2, LogOut, Sparkles, Wallet } from 'lucide-react';
import { toast } from 'sonner';

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function PrivyWalletButton() {
  const { login, logout, authenticated, ready } = usePrivy();
  const { address, isConnected } = useAccount();
  const {
    smartAccountAddress,
    smartAccountAddressSepolia,
    kernelReady,
    kernelError,
    kernelSepoliaError,
    sendTestSponsoredUserOp,
    sponsoring,
  } = useZeroDevKernel();
  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  if (!ready) {
    return (
      <Button variant="outline" size="sm" disabled className="h-8 gap-1.5 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading…
      </Button>
    );
  }

  if (!authenticated || !isConnected || !address) {
    return (
      <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => login()}>
        <Wallet className="h-3.5 w-3.5" />
        Log in
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-mono max-w-[200px]">
          <Wallet className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{truncate(address)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-normal space-y-2">
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">
              EOA (Privy)
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] break-all">{address}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => copy(address)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {smartAccountAddress && (
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">
                Smart account (ZeroDev · Base Sepolia)
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] break-all">{smartAccountAddress}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => copy(smartAccountAddress)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          {smartAccountAddressSepolia && (
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">
                Smart account (ZeroDev · Sepolia)
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] break-all">{smartAccountAddressSepolia}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => copy(smartAccountAddressSepolia)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          {(kernelError || kernelSepoliaError) && (
            <p className="text-[10px] text-destructive leading-tight">
              {kernelSepoliaError || kernelError}
            </p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {kernelReady && (
          <>
            <DropdownMenuItem
              disabled={sponsoring}
              className="text-xs gap-2 cursor-pointer"
              onClick={async () => {
                try {
                  const hash = await sendTestSponsoredUserOp();
                  if (hash) toast.success('Sponsored UserOp sent', { description: hash });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Sponsored tx failed');
                }
              }}
            >
              {sponsoring ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              )}
              Test gas sponsorship
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {!kernelReady && authenticated && !kernelError && (
          <DropdownMenuLabel className="text-[10px] text-muted-foreground font-normal py-1">
            Initializing ZeroDev kernel…
          </DropdownMenuLabel>
        )}
        <DropdownMenuItem className="text-xs gap-2 text-destructive" onClick={() => logout()}>
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
