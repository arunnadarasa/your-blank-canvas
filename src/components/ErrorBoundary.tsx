import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-mono text-sm">
          <h1 className="text-lg font-semibold text-red-400 mb-4">Something went wrong</h1>
          <pre className="whitespace-pre-wrap break-all text-zinc-300 mb-6">
            {this.state.error.message}
          </pre>
          <p className="text-zinc-500 text-xs mb-4">
            Check the browser console (⌥⌘J) for details. If you just added{' '}
            <code className="text-zinc-400">.env</code>, restart{' '}
            <code className="text-zinc-400">npm run dev</code>.
          </p>
          <button
            type="button"
            className="rounded-md bg-zinc-800 px-4 py-2 text-xs hover:bg-zinc-700"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
