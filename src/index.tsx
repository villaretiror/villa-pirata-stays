// 🔱 EMERGENCY BLACK BOX RECORDER (Bunker Shield v9.0)
if (typeof window !== 'undefined') {
  const reportError = (msg: string, err?: any) => {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:white;color:black;padding:40px;z-index:9999999;font-family:monospace;overflow:auto;display:flex;flex-direction:column;gap:20px;';
    div.innerHTML = `
      <h1 style="color:red;font-size:24px;">🔱 SALTY EMERGENCY RESCUE INTERCEPT</h1>
      <p><b>Error:</b> ${msg}</p>
      <pre style="background:#eee;padding:20px;border-radius:10px;white-space:pre-wrap;">${err?.stack || JSON.stringify(err, null, 2) || 'No stack trace available'}</pre>
      <div style="font-size:12px;opacity:0.6;">
        <p><b>Agent Context:</b> ${navigator.userAgent}</p>
        <p><b>URL:</b> ${window.location.href}</p>
        <p><b>Timestamp:</b> ${new Date().toISOString()}</p>
      </div>
      <button onclick="window.location.reload(true)" style="padding:15px;background:black;color:white;border:none;border-radius:5px;cursor:pointer;font-weight:bold;">REINTENTAR PURGA (FORCED)</button>
    `;
    document.body.appendChild(div);
    console.error("🔱 Salty Intercept Success:", msg, err);
  };

  window.addEventListener('error', (e) => reportError(e.message, e.error));
  window.addEventListener('unhandledrejection', (e) => reportError('Unhandled Promise Rejection', e.reason));
  console.log('🔱 Salty Emergency Radar: ACTIVE');
}

import './blindage';
import React, { Component, ErrorInfo, ReactNode, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
import { PropertyProvider } from './contexts/PropertyContext';
import { BookingProvider } from './contexts/BookingContext';
import { AlertTriangle } from 'lucide-react';

// 1. Error Boundary Wrapper
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical Render Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="text-primary w-12 h-12 mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-2">Algo salió mal</h2>
          <p className="text-text-light text-sm mb-6">Hemos tenido un problema al cargar esta sección. Por favor, intenta recargar.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-black text-white px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg"
          >
            Recargar App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// 2. Scroll-to-Top Utility (Global Restorer)
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};



const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Villa Retiro R | Could not find root element.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <PropertyProvider>
            <BookingProvider>
              <App />
            </BookingProvider>
          </PropertyProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
