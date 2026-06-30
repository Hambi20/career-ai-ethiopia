'use client';

import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error?: Error }

export class TabErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-red-50 p-4 dark:bg-red-950/40">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="mt-3 text-sm font-medium text-muted-foreground">This tab encountered an error</p>
          <p className="mt-1 text-xs text-muted-foreground/70 max-w-sm">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            className="mt-3 px-3 py-1.5 text-xs rounded-md bg-muted hover:bg-muted/80 text-muted-foreground"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default TabErrorBoundary;
