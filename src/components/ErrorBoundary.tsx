import {Component, type ReactNode, type ErrorInfo} from 'react';

export default class ErrorBoundary extends Component<{children: ReactNode}> {
  declare props: {children: ReactNode};
  state = {hasError: false, error: null as Error | null};

  static getDerivedStateFromError(error: Error) {
    return {hasError: true, error};
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[LaserBench ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080808] text-[#E8E8E8] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-[#0F0F0F] border border-white/10 rounded-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mx-auto font-bold text-black text-lg">
              LB
            </div>
            <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              LaserBench encountered an unexpected error. Your machine and material data stored in
              this browser is safe.
            </p>
            <details className="text-left">
              <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-300 transition">
                Error details
              </summary>
              <pre className="mt-2 text-[11px] text-red-400 bg-black/40 rounded p-3 overflow-auto max-h-40 font-mono">
                {this.state.error?.message}
                {'\n'}
                {this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-black text-sm font-semibold rounded-lg transition cursor-pointer"
            >
              Reload LaserBench
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
