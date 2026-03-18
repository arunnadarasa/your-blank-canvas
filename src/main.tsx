import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "./index.css";

// Some web3/auth deps (Privy / ZeroDev / viem ecosystem) still expect Node's Buffer global.
if ((globalThis as any).Buffer === undefined) {
  (globalThis as any).Buffer = Buffer;
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
