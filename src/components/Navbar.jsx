import React, { useState, useEffect } from 'react';
import { Clock, Wifi, WifiOff, RefreshCw, Loader2, Volume2, VolumeOff, Mic, MicOff } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Componente para exibir a hora e data atual
const DateTimeDisplay = () => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = format(currentDateTime, 'dd/MM/yyyy', { locale: ptBR });
  const formattedTime = format(currentDateTime, 'HH:mm:ss', { locale: ptBR });

  return (
    <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
      <Clock className="h-4 w-4 flex-shrink-0" />
      <span>{formattedDate}</span>
      <span className="font-mono">{formattedTime}</span>
    </div>
  );
};

// Componente para exibir os indicadores de status
const StatusIndicators = ({ isAudioMuted, isMicMuted, isOnline, isUpdating }) => {
  return (
    <div className="flex items-center space-x-4 flex-shrink-0">
      {/* Indicador de Microfone */}
      <div className="flex items-center space-x-1" title={isMicMuted ? "Microfone Mudo" : "Microfone Ativo"}>
        {isMicMuted ? (
          <MicOff className="h-5 w-5 text-red-500" />
        ) : (
          <Mic className="h-5 w-5 text-green-500" />
        )}
        <span className="sr-only">{isMicMuted ? "Microfone Mudo" : "Microfone Ativo"}</span>
      </div>
      
      {/* Indicador de Áudio */}
      <div className="flex items-center space-x-1" title={isAudioMuted ? "Áudio Mudo" : "Áudio Ativo"}>
        {isAudioMuted ? (
          <VolumeOff className="h-5 w-5 text-red-500" />
        ) : (
          <Volume2 className="h-5 w-5 text-green-500" />
        )}
        <span className="sr-only">{isAudioMuted ? "Áudio Mudo" : "Áudio Ativo"}</span>
      </div>

      {/* Indicador de Rede */}
      <div className="flex items-center space-x-1" title={isOnline ? "Conectado" : "Sem Conexão"}>
        {isOnline ? (
          <Wifi className="h-5 w-5 text-green-500" />
        ) : (
          <WifiOff className="h-5 w-5 text-red-500" />
        )}
        <span className="sr-only">{isOnline ? "Conectado" : "Sem Conexão"}</span>
      </div>

      {/* Indicador de Atualização */}
      {isUpdating && (
        <div className="flex items-center space-x-1 text-blue-500" title="Atualizando...">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="sr-only">Atualizando</span>
        </div>
      )}
      {!isUpdating && (
        <div className="flex items-center space-x-1 text-gray-500" title="Sistema Atualizado">
          <RefreshCw className="h-5 w-5" />
          <span className="sr-only">Atualizado</span>
        </div>
      )}
    </div>
  );
};

// Componente principal da Navbar
const Navbar = ({ isAudioMuted = true, isMicMuted = true, isOnline = false, isUpdating = false }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full h-14 border-b bg-white/90 backdrop-blur-sm dark:bg-gray-900/90">
      <div className="h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Lado Esquerdo: Hora e Data */}
        <DateTimeDisplay />

        {/* Lado Direito: Indicadores de Status */}
        <StatusIndicators isAudioMuted={isAudioMuted} isMicMuted={isMicMuted} isOnline={isOnline} isUpdating={isUpdating} />
      </div>
    </header>
  );
};

export default Navbar;
