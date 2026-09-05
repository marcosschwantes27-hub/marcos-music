import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  QrCode,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Share2,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  Apple,
  PlusSquare,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiFetch } from '../utils/api';

export default function InstallMobileModal({ isOpen, onClose }) {
  const [activePlatform, setActivePlatform] = useState('iphone'); // 'iphone' | 'android'
  const [mobileUrl, setMobileUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Determine network URL via backend to avoid 'localhost' on mobile
    const fetchNetworkIp = async () => {
      try {
        const res = await apiFetch('/api/network-ip');
        if (res.ok) {
          const data = await res.json();
          if (data.ip && data.ip !== '127.0.0.1') {
            setMobileUrl(`http://${data.ip}:${data.port || '5173'}`);
            return;
          }
        }
      } catch (err) {
        console.warn('Não foi possível obter o IP da rede:', err);
      }
      // Fallback
      const host = window.location.hostname;
      const port = window.location.port || '5173';
      const protocol = window.location.protocol;
      setMobileUrl(`${protocol}//${host}:${port}`);
    };

    fetchNetworkIp();

    // Listen to native PWA install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none font-spotify">
      <div className="bg-spotify-surface border border-spotify-border/40 rounded-card shadow-spotify-heavy w-full max-w-xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-spotify-border/30">
          <div className="flex items-center gap-2.5">
            <Smartphone className="text-spotify-green" size={22} />
            <h2 className="text-base font-bold text-spotify-textBase">
              Instalar Marcos Music no Celular
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-spotify-textSubdued hover:text-spotify-textBase transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex border-b border-spotify-border/30 bg-spotify-middark/50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActivePlatform('iphone')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold transition-colors relative ${
              activePlatform === 'iphone'
                ? 'text-white border-b-2 border-spotify-green'
                : 'text-spotify-textSubdued hover:text-white'
            }`}
          >
            <Apple size={16} />
            <span>iPhone (iOS)</span>
          </button>
          <button
            onClick={() => setActivePlatform('android')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold transition-colors relative ${
              activePlatform === 'android'
                ? 'text-white border-b-2 border-spotify-green'
                : 'text-spotify-textSubdued hover:text-white'
            }`}
          >
            <Smartphone size={16} />
            <span>Android (APK / PWA)</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Direct Android Install Prompt if opened in Android browser */}
          {activePlatform === 'android' && deferredPrompt && (
            <div className="p-4 rounded-card bg-spotify-green/15 border border-spotify-green/40 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white">Instalar App Agora</h4>
                <p className="text-xs text-spotify-textSubdued">
                  Adicione o Marcos Music à sua tela inicial com 1 toque.
                </p>
              </div>
              <button
                onClick={handleNativeInstall}
                className="py-2 px-5 rounded-fullpill bg-spotify-green hover:bg-spotify-greenHover text-black text-xs font-bold uppercase tracking-spotify-caps transition-all transform active:scale-95 shadow-md flex-shrink-0"
              >
                Instalar
              </button>
            </div>
          )}

          {/* ================= IPHONE (iOS) TAB ================= */}
          {activePlatform === 'iphone' && (
            <div className="space-y-4">
              <div className="bg-spotify-middark p-5 rounded-card border border-spotify-border/40 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-spotify-caps text-spotify-green flex items-center gap-1.5">
                    <Apple size={16} />
                    Instalação no iPhone via Safari (PWA Nativo)
                  </span>
                  <span className="text-[10px] bg-spotify-green/20 text-spotify-green px-2 py-0.5 rounded font-bold uppercase">
                    Sem Jailbreak / Sem App Store
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-5 items-center">
                  {/* QR Code */}
                  <div className="w-[140px] h-[140px] bg-white p-2.5 rounded-card shadow-lg flex items-center justify-center mx-auto sm:mx-0">
                    <QRCodeSVG value={mobileUrl} size={120} level="M" />
                  </div>

                  {/* Step by step for iOS */}
                  <div className="space-y-2 text-xs text-spotify-textSubdued">
                    <p className="text-white font-bold text-sm">
                      Passo a Passo para o iPhone:
                    </p>
                    <ol className="space-y-2 list-decimal list-inside leading-relaxed">
                      <li>
                        Conecte o iPhone no <strong>mesmo Wi-Fi</strong> do computador.
                      </li>
                      <li>
                        Abra a <strong>Câmera do iPhone</strong> e aponte para o QR Code (ou abra o link abaixo no <strong>navegador Safari</strong>).
                      </li>
                      <li>
                        No Safari, toque no botão de <strong className="text-white">Compartilhar</strong> (ícone do quadrado com a seta para cima <Share2 size={13} className="inline text-blue-400" /> na barra inferior).
                      </li>
                      <li>
                        Role para baixo e toque em <strong className="text-white">"Adicionar à Tela de Início"</strong> (ícone com sinal de <PlusSquare size={13} className="inline text-spotify-green" />).
                      </li>
                      <li>
                        Toque em <strong className="text-white">"Adicionar"</strong> no canto superior direito.
                      </li>
                    </ol>
                  </div>
                </div>

                {/* Important Tip for iOS */}
                <div className="bg-spotify-surface p-3 rounded-card border border-spotify-border/30 text-[11px] text-spotify-textSubdued">
                  <p className="font-semibold text-white mb-1">💡 Dica importante da Apple:</p>
                  <p>
                    O iPhone exige que seja aberto pelo <strong>Safari</strong> (não pelo Google Chrome do iOS) para que o botão de <em>"Adicionar à Tela de Início"</em> transforme a página em um aplicativo de tela cheia sem barra de endereço.
                  </p>
                </div>

                {/* URL Copy Bar */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={mobileUrl}
                    className="flex-1 bg-spotify-surface text-white text-xs px-3 py-2 rounded-fullpill outline-none border border-spotify-border/30 font-mono"
                  />
                  <button
                    onClick={handleCopy}
                    className="py-2 px-4 rounded-fullpill bg-spotify-surface hover:bg-spotify-elevated text-white text-xs font-bold uppercase tracking-spotify-caps flex items-center gap-1.5 transition-colors border border-spotify-border/40"
                  >
                    {copied ? <Check size={14} className="text-spotify-green" /> : <Copy size={14} />}
                    <span>{copied ? 'Copiado' : 'Copiar Link'}</span>
                  </button>
                </div>
              </div>

              {/* iOS Features Guarantee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-card bg-spotify-green/10 border border-spotify-green/30 text-xs flex items-start gap-2.5">
                  <HardDrive size={18} className="text-spotify-green flex-shrink-0 mt-0.5" />
                  <div className="text-spotify-textSubdued">
                    <strong className="text-white block mb-0.5">Músicas Salvas no iPhone:</strong>
                    Tudo é gravado no armazenamento interno do iPhone (IndexedDB). Não gasta seus dados 4G/5G.
                  </div>
                </div>
                <div className="p-3.5 rounded-card bg-spotify-green/10 border border-spotify-green/30 text-xs flex items-start gap-2.5">
                  <Sparkles size={18} className="text-spotify-green flex-shrink-0 mt-0.5" />
                  <div className="text-spotify-textSubdued">
                    <strong className="text-white block mb-0.5">Tela de Bloqueio & Bluetooth:</strong>
                    Controles nativos do iOS na tela bloqueada e no painel do carro via Bluetooth.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= ANDROID TAB ================= */}
          {activePlatform === 'android' && (
            <div className="space-y-4">
              {/* METHOD 1: Instant Install via QR Code (WebAPK / PWA) */}
              <div className="bg-spotify-middark p-5 rounded-card border border-spotify-border/40 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-spotify-caps text-spotify-green flex items-center gap-1.5">
                    <Sparkles size={14} />
                    Método 1: Instalação Instantânea no Android
                  </span>
                  <span className="text-[10px] bg-spotify-green/20 text-spotify-green px-2 py-0.5 rounded font-bold uppercase">
                    Mais Rápido
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-5 items-center">
                  <div className="w-[140px] h-[140px] bg-white p-2.5 rounded-card shadow-lg flex items-center justify-center mx-auto sm:mx-0">
                    <QRCodeSVG value={mobileUrl} size={120} level="M" />
                  </div>

                  <div className="space-y-2 text-xs text-spotify-textSubdued">
                    <p className="text-white font-bold text-sm">Como instalar em 10 segundos:</p>
                    <ol className="space-y-1.5 list-decimal list-inside leading-relaxed">
                      <li>Conecte o celular no mesmo Wi-Fi do computador.</li>
                      <li>Aponte a câmera do seu celular para o QR Code ao lado.</li>
                      <li>
                        No navegador do celular, clique em <strong>"Instalar Aplicativo"</strong> ou nos 3 pontinhos &gt; <strong>"Adicionar à tela inicial"</strong>.
                      </li>
                      <li>
                        O Android cria um <strong>aplicativo executável</strong> com ícone próprio na sua gaveta de apps.
                      </li>
                    </ol>
                  </div>
                </div>

                {/* URL Copy Bar */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={mobileUrl}
                    className="flex-1 bg-spotify-surface text-white text-xs px-3 py-2 rounded-fullpill outline-none border border-spotify-border/30 font-mono"
                  />
                  <button
                    onClick={handleCopy}
                    className="py-2 px-4 rounded-fullpill bg-spotify-surface hover:bg-spotify-elevated text-white text-xs font-bold uppercase tracking-spotify-caps flex items-center gap-1.5 transition-colors border border-spotify-border/40"
                  >
                    {copied ? <Check size={14} className="text-spotify-green" /> : <Copy size={14} />}
                    <span>{copied ? 'Copiado' : 'Copiar Link'}</span>
                  </button>
                </div>
              </div>

              {/* METHOD 2: Native Android APK Project (Capacitor) */}
              <div className="bg-spotify-middark p-5 rounded-card border border-spotify-border/40 space-y-3 text-xs text-spotify-textSubdued">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-spotify-caps text-white flex items-center gap-1.5">
                    <Cpu size={14} className="text-spotify-green" />
                    Método 2: Projeto Nativo Android (Gerar APK)
                  </span>
                  <span className="text-[10px] bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded font-bold uppercase">
                    Capacitor / Gradle
                  </span>
                </div>

                <p className="leading-relaxed">
                  O projeto nativo Android completo com <strong>Capacitor</strong> já foi gerado na pasta:
                  <br />
                  <code className="text-spotify-green font-mono bg-black/40 px-2 py-0.5 rounded mt-1 inline-block">
                    MarcosMusic\android\
                  </code>
                </p>

                <p className="leading-relaxed">
                  Para compilar o arquivo <strong className="text-white">.apk</strong> independente:
                </p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>
                    Basta abrir a pasta <code className="text-white font-mono">android</code> no <strong>Android Studio</strong> e clicar em <strong>Build &gt; Build APK</strong>.
                  </li>
                  <li>
                    Ou executar o script: <code className="text-spotify-green font-mono">gerar-apk.bat</code> na pasta do projeto.
                  </li>
                </ul>
              </div>

              {/* Offline Storage Guarantee */}
              <div className="flex items-center gap-3 p-3.5 rounded-card bg-spotify-green/10 border border-spotify-green/30 text-xs">
                <HardDrive size={22} className="text-spotify-green flex-shrink-0" />
                <div className="flex-1 text-spotify-textSubdued leading-snug">
                  <strong className="text-white">Armazenamento 100% no Celular:</strong> Todas as faixas ficam armazenadas na memória interna do seu Android (IndexedDB) para tocar sem internet.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-black/40 border-t border-spotify-border/30 flex items-center justify-between">
          <span className="text-[11px] text-spotify-textSubdued">
            Compatível com iOS 14+ e Android 8+
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-fullpill bg-spotify-middark hover:bg-spotify-elevated text-xs font-bold uppercase tracking-spotify-caps text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
