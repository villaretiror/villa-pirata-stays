import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    sectionName?: string;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

class SectionErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        errorMessage: ''
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, errorMessage: error.message };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Error in section ${this.props.sectionName || 'Unknown'}:`, error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="bg-red-50/50 backdrop-blur-sm border border-red-100 p-8 rounded-[2rem] text-center my-4 animate-fade-in shadow-soft">
                    <span className="material-icons text-red-400 text-4xl mb-3">error_outline</span>
                    <h3 className="font-serif font-bold text-text-main text-lg mb-1">Error en {this.props.sectionName || 'esta sección'}</h3>
                    <p className="text-text-light text-xs mb-6 max-w-[240px] mx-auto italic">Hubo un fallo al renderizar estos datos. Intenta recargar la página para reintentar.</p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="bg-black text-white px-8 py-3 rounded-full text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 hover:scale-105 transition-all shadow-lg"
                    >
                        Reintentar
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default SectionErrorBoundary;
