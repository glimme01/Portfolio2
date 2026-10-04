import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Arcade ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          color: '#fff',
          fontFamily: 'var(--font-pixel, monospace)'
        }}>
          <div style={{
            background: 'rgba(255, 0, 85, 0.1)',
            border: '2px solid #ff0055',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '560px',
            boxShadow: '0 0 20px rgba(255, 0, 85, 0.3)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👾</div>
            <h2 style={{ color: '#ff0055', fontSize: '1rem', marginBottom: '1rem', letterSpacing: '1px' }}>
              FEHLER BEIM LADEN DES SPIELS
            </h2>
            <p style={{ fontSize: '0.65rem', lineHeight: '1.6', color: '#ccc', marginBottom: '1.5rem' }}>
              Ein unerwarteter Fehler ist aufgetreten:
            </p>
            <div style={{
              background: '#111',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '0.6rem',
              color: '#ffb703',
              marginBottom: '1.5rem',
              overflowX: 'auto',
              textAlign: 'left'
            }}>
              {this.state.error?.message || 'Unbekannter Ausnahmefehler'}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                🔄 NEU LADEN
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
              >
                🏠 ZUR LOBBY
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
