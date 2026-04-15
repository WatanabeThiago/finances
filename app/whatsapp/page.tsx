'use client';

import { useEffect, useState } from 'react';
import { PageIntro } from '@/components/page-intro';

interface WhatsAppStatus {
  isReady: boolean;
  isInitializing: boolean;
  error?: string;
}

export default function WhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatus>({
    isReady: false,
    isInitializing: false,
  });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp?action=status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
        if (data.qrCode) {
          setQrCode(data.qrCode);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const handleInitialize = async () => {
    setLoading(true);
    setMessage('Iniciando cliente WhatsApp...');
    
    try {
      const response = await fetch('/api/whatsapp?action=init');
      const data = await response.json();
      
      if (data.success) {
        setMessage('Cliente iniciado! Aguardando QR Code...');
        checkStatus();
      } else {
        setMessage(`Erro: ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`Erro ao inicializar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageIntro title="WhatsApp Connector">
        Conectar e gerenciar sua conta WhatsApp
      </PageIntro>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Status da Conexão</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Inicializando:</span>
              <span className={`font-medium ${status.isInitializing ? 'text-blue-600' : 'text-gray-500'}`}>
                {status.isInitializing ? '⏳ Sim' : '✗ Não'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Conectado:</span>
              <span className={`font-medium ${status.isReady ? 'text-green-600' : 'text-red-600'}`}>
                {status.isReady ? '✓ Sim' : '✗ Não'}
              </span>
            </div>
            
            {status.error && (
              <div className="text-red-600 text-sm">
                Erro: {status.error}
              </div>
            )}

            {message && (
              <div className={`text-sm p-2 rounded ${
                message.includes('Erro') 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {message}
              </div>
            )}
          </div>

          <button
            onClick={handleInitialize}
            disabled={loading || status.isInitializing}
            className="mt-6 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            {loading || status.isInitializing ? 'Carregando...' : 'Iniciar Conexão'}
          </button>
        </div>

        {/* QR Code Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">QR Code</h2>
          
          {qrCode ? (
            <div className="bg-gray-100 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-2">
                Escaneie com seu WhatsApp:
              </p>
              <pre className="text-xs font-mono bg-white p-2 rounded overflow-auto max-h-64">
                {qrCode}
              </pre>
            </div>
          ) : status.isReady ? (
            <div className="text-center text-green-600">
              ✓ Já autenticado. Sem necessidade de QR Code.
            </div>
          ) : (
            <div className="text-center text-gray-500">
              {status.isInitializing 
                ? 'Gerando QR Code...' 
                : 'Clique em "Iniciar Conexão" para gerar QR Code'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
