import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import path from 'path';

let client: Client | null = null;
let isInitializing = false;

export interface WhatsAppClientStatus {
  isReady: boolean;
  isInitializing: boolean;
  error?: string;
}

export async function initializeWhatsAppClient(): Promise<Client> {
  if (client) {
    return client;
  }

  if (isInitializing) {
    // Aguardar se já está inicializando
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (client) {
          clearInterval(checkInterval);
          resolve(client);
        }
      }, 100);
    });
  }

  isInitializing = true;

  try {
    // Usar LocalAuth para salvar a sessão automaticamente
    client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'main-whatsapp-client',
        dataPath: path.join(process.cwd(), '.wwebjs_auth'),
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
        ],
      },
    });

    // Evento QR Code - exibir quando necessário autenticação
    client.on('qr', (qr: string) => {
      console.log('QR Code gerado. Escaneie com seu telefone:');
      qrcode.generate(qr, { small: true });
      
      // Você também pode salvar ou enviar o QR code via API
      // emit uma evento ou salvar em arquivo se necessário
    });

    // Evento quando autenticação é bem-sucedida
    client.on('authenticated', () => {
      console.log('Autenticação bem-sucedida!');
      isInitializing = false;
    });

    // Evento quando cliente está pronto
    client.on('ready', () => {
      console.log('Cliente WhatsApp pronto!');
      isInitializing = false;
    });

    // Evento de desconexão
    client.on('disconnected', () => {
      console.log('Cliente desconectado');
      client = null;
      isInitializing = false;
    });

    // Evento de erro
    client.on('error', (error) => {
      console.error('Erro no WhatsApp:', error);
      isInitializing = false;
    });

    // Evento de mensagem recebida
    client.on('message', (msg) => {
      console.log('Mensagem recebida:', msg.body);
    });

    await client.initialize();
    return client;
  } catch (error) {
    isInitializing = false;
    throw error;
  }
}

export async function getWhatsAppClient(): Promise<Client> {
  if (client) {
    return client;
  }
  return initializeWhatsAppClient();
}

export function getClientStatus(): WhatsAppClientStatus {
  return {
    isReady: !!client && client.info?.wid !== undefined,
    isInitializing,
    error: undefined,
  };
}

export async function destroyClient(): Promise<void> {
  if (client) {
    await client.destroy();
    client = null;
  }
}
