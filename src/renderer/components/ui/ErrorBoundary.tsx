/**
 * Error Boundary component
 * Catches JavaScript errors anywhere in the component tree
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI or default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">
              <span>⚠</span>
            </div>
            <h2 className="error-boundary-title">
              予期しないエラーが発生しました
            </h2>
            <p className="error-boundary-message">
              アプリケーションで問題が発生しました。ページを再読み込みしてみてください。
            </p>
            {this.state.error && (
              <details className="error-boundary-details">
                <summary className="error-boundary-summary">
                  エラーの詳細を表示
                </summary>
                <pre className="error-boundary-error">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <div className="error-boundary-actions">
              <button
                onClick={this.handleReset}
                className="btn btn-primary"
              >
                再試行
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary"
              >
                ページを再読み込み
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}