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
