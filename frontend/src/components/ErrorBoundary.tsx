import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex items-center justify-center p-6">
          <div className="bg-white border border-[#E6E2D8] rounded-3xl p-8 max-w-lg w-full text-center space-y-4 shadow-lg">
            <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-base font-serif font-extrabold text-[#1E1D1A]">
              {this.props.fallbackTitle || 'Component Render Interrupted'}
            </h2>
            <p className="text-xs text-[#8C887E]">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 bg-[#1E1D1A] hover:bg-black text-white px-5 py-2.5 rounded-2xl text-[10px] font-extrabold uppercase tracking-wider transition-all shadow-md"
            >
              <RefreshCw size={12} />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
