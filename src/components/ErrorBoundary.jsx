import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  handleReload = () => {
    // Clear any potential corrupt service worker caches and force fresh reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-screen bg-[#121212] text-white p-6 text-center select-none font-spotify">
          <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-6 shadow-lg">
            <AlertCircle size={36} />
          </div>
          <h1 className="text-2xl font-bold font-spotifyTitle mb-2">
            Ops! Algo deu errado ao carregar
          </h1>
          <p className="text-sm text-spotify-textSubdued max-w-md mb-6 leading-relaxed">
            Houve uma atualização recente no aplicativo. Clique no botão abaixo para recarregar a versão mais recente.
          </p>
          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-spotify-green text-black font-bold text-sm hover:scale-105 transition-transform active:scale-95 shadow-spotify-heavy"
          >
            <RefreshCw size={16} />
            Recarregar Aplicativo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
