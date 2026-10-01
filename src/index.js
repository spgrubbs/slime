import React from 'react';
import ReactDOM from 'react-dom/client';
import SlimeQueen from './SlimeQueen.jsx';

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
    <SlimeQueen />
  </ErrorBoundary>
);

// The offline shell, so an installed PWA opens with no connection.
//
// Deliberately NOT registered inside the Capacitor shell. The native app already
// serves every asset from local files, so the cache buys nothing — and it costs
// something real: the WebView's storage survives an APK upgrade, so a cached
// bundle would keep being served after you install a new build. "I sideloaded
// the new APK and it is still showing the old one" is the worst bug to hit in
// the middle of a playtest, because nothing about it looks like a caching
// problem.
//
// Detected via the `Capacitor` global the native bridge injects, not via the
// URL scheme: androidScheme is 'https', so the protocol inside the app is
// indistinguishable from the web.
const inNativeShell = typeof window !== 'undefined' && !!window.Capacitor;

if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production' && !inNativeShell) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL}/service-worker.js`)
      .catch(err => console.warn('Service worker registration failed:', err));
  });
} else if ('serviceWorker' in navigator && inNativeShell) {
  // Clear out anything a previous build registered here before this was fixed,
  // otherwise that stale cache outlives the upgrade that was meant to replace it.
  navigator.serviceWorker.getRegistrations()
    .then(rs => rs.forEach(r => r.unregister()))
    .catch(() => {});
}
