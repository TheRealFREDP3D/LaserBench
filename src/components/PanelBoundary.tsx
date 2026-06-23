import {Component, type ReactNode, type ErrorInfo} from 'react';

interface PanelBoundaryProps {
  name: string;
  children: ReactNode;
}

export default class PanelBoundary extends Component<PanelBoundaryProps> {
  declare props: PanelBoundaryProps;
  state = {hasError: false, error: null as Error | null};

  static getDerivedStateFromError(error: Error) {
    return {hasError: true, error};
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[LaserBench ${this.props.name}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <div className="w-8 h-8 bg-red-600/20 border border-red-600/40 rounded flex items-center justify-center text-red-400 text-xs font-bold">
            !
          </div>
          <p className="text-xs text-neutral-400 max-w-[200px]">
            {this.props.name} failed to render.
          </p>
          <pre className="text-[10px] text-red-400/70 max-w-[250px] overflow-hidden text-ellipsis">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
