import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-[#141414] border border-[#2D2D2D] text-white flex flex-col items-center justify-center text-center space-y-3 my-4">
          <div className="w-10 h-10 rounded-full bg-[#FF3B30]/15 flex items-center justify-center text-[#FF3B30]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-heading font-bold text-sm text-white">
            {this.props.fallbackTitle || 'Something went wrong rendering this view'}
          </h3>
          <p className="font-mono text-xs text-[#888888] max-w-md">
            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-white text-xs font-mono transition-colors cursor-pointer border border-[#333333]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
