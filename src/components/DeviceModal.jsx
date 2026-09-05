import React, { useState } from 'react';
import {
  X,
  Speaker,
  Headphones,
  Car,
  Laptop,
  Check,
  Radio,
  Bluetooth,
  RotateCw,
  Info,
  Loader2,
  Volume2,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function DeviceModal({ isOpen, onClose }) {
  const {
    audioDevices,
    selectedDeviceId,
    currentDeviceName,
    isBluetoothActive,
    selectAudioDevice,
    pairBluetoothDevice,
    fetchAudioDevices,
    isPlaying,
  } = usePlayer();

  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);

  if (!isOpen) return null;

  const handlePair = async () => {
    setIsScanning(true);
    setScanMessage(null);
    try {
      const result = await pairBluetoothDevice();
      if (result.success) {
        setScanMessage({
          type: 'success',
          text: `Conectado a ${result.name}! O som agora tocará neste dispositivo.`,
        });
      } else {
        setScanMessage({
          type: 'info',
          text: 'Se o dispositivo do seu carro já estiver pareado no Windows/Celular, selecione-o na lista abaixo.',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const getDeviceIcon = (device) => {
    const label = (device.label || '').toLowerCase();
    if (label.includes('car') || label.includes('automotivo') || label.includes('veículo')) {
      return Car;
    }
    if (
      label.includes('fone') ||
      label.includes('headphone') ||
      label.includes('headset') ||
      label.includes('airpods') ||
      label.includes('tws')
    ) {
      return Headphones;
    }
    if (device.isBluetooth || label.includes('bluetooth')) {
      return Bluetooth;
    }
    if (device.deviceId === 'default') {
      return Laptop;
    }
    return Speaker;
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none font-spotify">
      <div className="bg-spotify-surface border border-spotify-border/40 rounded-card shadow-spotify-heavy w-full max-w-lg overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-spotify-border/30">
          <div className="flex items-center gap-2.5">
            <Radio className="text-spotify-green animate-pulse" size={20} />
            <h2 className="text-base font-bold text-spotify-textBase">
              Conectar a um Dispositivo (Bluetooth / Som do Carro)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-spotify-textSubdued hover:text-spotify-textBase transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Current Device Banner */}
          <div className="bg-spotify-middark p-4 rounded-card border border-spotify-border/40 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-spotify-green/20 text-spotify-green flex items-center justify-center flex-shrink-0">
                {isBluetoothActive ? <Bluetooth size={24} /> : <Speaker size={24} />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-spotify-caps font-bold text-spotify-green flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-spotify-green animate-ping" />
                  Ouvindo Agora Em:
                </span>
                <span className="text-sm font-bold text-white truncate">
                  {currentDeviceName}
                </span>
                <span className="text-xs text-spotify-textSubdued">
                  {isPlaying ? 'Áudio transmitindo em tempo real' : 'Pronto para tocar'}
                </span>
              </div>
            </div>

            {isPlaying && (
              <div className="flex items-end gap-1 h-5 px-2">
                <span className="w-1 bg-spotify-green rounded-full animate-soundwave-1 h-3" />
                <span className="w-1 bg-spotify-green rounded-full animate-soundwave-2 h-5" />
                <span className="w-1 bg-spotify-green rounded-full animate-soundwave-3 h-2" />
                <span className="w-1 bg-spotify-green rounded-full animate-soundwave-2 h-4" />
              </div>
            )}
          </div>

          {/* Action: Pair Bluetooth Device */}
          <div>
            <button
              onClick={handlePair}
              disabled={isScanning}
              className="w-full py-3 px-5 rounded-fullpill bg-spotify-green hover:bg-spotify-greenHover text-black text-xs font-bold uppercase tracking-spotify-caps flex items-center justify-center gap-2.5 transition-all transform active:scale-95 shadow-md"
            >
              {isScanning ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Procurando dispositivos Bluetooth...</span>
                </>
              ) : (
                <>
                  <Bluetooth size={18} strokeWidth={2.5} />
                  <span>Buscar Novo Dispositivo Bluetooth</span>
                </>
              )}
            </button>

            {scanMessage && (
              <p
                className={`text-xs mt-2 text-center font-medium ${
                  scanMessage.type === 'success' ? 'text-spotify-green' : 'text-spotify-textSubdued'
                }`}
              >
                {scanMessage.text}
              </p>
            )}
          </div>

          {/* List of Detected Devices */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-spotify-caps text-spotify-textSubdued">
                Dispositivos de Áudio Disponíveis ({audioDevices.length})
              </span>
              <button
                onClick={() => fetchAudioDevices()}
                className="text-xs text-spotify-textSubdued hover:text-white flex items-center gap-1 transition-colors"
                title="Atualizar lista"
              >
                <RotateCw size={13} />
                <span>Atualizar</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {audioDevices.length === 0 ? (
                <div className="p-4 text-center text-xs text-spotify-textSubdued bg-spotify-middark/40 rounded-subtle">
                  Nenhum dispositivo adicional detectado. Conecte seu dispositivo Bluetooth no sistema operacional.
                </div>
              ) : (
                audioDevices.map((device) => {
                  const Icon = getDeviceIcon(device);
                  const isSelected = selectedDeviceId === device.deviceId;

                  return (
                    <button
                      key={device.deviceId}
                      onClick={() => selectAudioDevice(device.deviceId)}
                      className={`w-full p-3 rounded-card flex items-center justify-between transition-colors border ${
                        isSelected
                          ? 'bg-spotify-middark text-spotify-green border-spotify-green/50 font-bold'
                          : 'bg-spotify-middark/50 text-spotify-textBase hover:bg-spotify-middark border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          size={18}
                          className={isSelected ? 'text-spotify-green' : 'text-spotify-textSubdued'}
                        />
                        <div className="flex flex-col text-left min-w-0">
                          <span className="text-xs truncate">{device.label}</span>
                          <span className="text-[10px] text-spotify-textSubdued font-normal">
                            {device.isBluetooth
                              ? 'Dispositivo Bluetooth / Sem fio'
                              : device.deviceId === 'default'
                              ? 'Saída padrão do sistema'
                              : 'Saída de áudio direta'}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1.5 text-spotify-green text-xs font-bold">
                          <span>Ativo</span>
                          <Check size={16} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>


        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-black/40 border-t border-spotify-border/30 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-fullpill bg-spotify-middark hover:bg-spotify-elevated text-xs font-bold uppercase tracking-spotify-caps text-white transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
