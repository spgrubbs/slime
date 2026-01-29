import React from 'react';
import ReactDOM from 'react-dom/client';
import HiveQueenGame from './HiveQueenV4.jsx';

// Error Boundary to catch and display errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 20,
          background: '#1a1a2e',
          color: '#fff',
          minHeight: '100vh',
          fontFamily: 'monospace'
        }}>
          <h1 style={{ color: '#ef4444' }}>Something went wrong</h1>
          <p style={{ marginTop: 10 }}>Please try clearing your saved data:</p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              marginTop: 10,
              padding: '10px 20px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer'
            }}
          >
            Clear Data & Reload
          </button>
          <pre style={{
            marginTop: 20,
            padding: 15,
            background: '#0a0a15',
            borderRadius: 5,
            overflow: 'auto',
            fontSize: 12
          }}>
            {this.state.error && this.state.error.toString()}
            {'\n\n'}
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <HiveQueenGame />
  </ErrorBoundary>
);
