import React from 'react';
import { Sentry } from '../config/monitoring';
import './ErrorBoundary.css';

const DEBUG = import.meta.env.DEV;
const logError = DEBUG ? console.error : () => {};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(err, errorInfo) {
    logError('[ErrorBoundary] Uncaught error:', err, errorInfo);
    if (import.meta.env.VITE_SENTRY_DSN) {
      Sentry.captureException(err, { extra: { componentStack: errorInfo?.componentStack } });
    }
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <h1>Something went wrong.</h1>
          <details>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button type="button" onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
