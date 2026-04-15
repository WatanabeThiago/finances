/**
 * Exemplo de uso básico do WhatsApp Web.js
 * Para conectar e exibir QR Code
 * 
 * Use este arquivo como referência para entender o fluxo
 */

import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import path from 'path';

// Configuração básica do cliente
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'whatsapp-bot',
    dataPath: path.join(process.cwd(), '.wwebjs_auth'),
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  },
});

// ==================== EVENTOS ====================

// Evento: QR Code gerado (precisa de autenticação)
client.on('qr', (qr: string) => {
  console.log('\n=== QR CODE GERADO ===');
  console.log('Escaneie o código abaixo com seu WhatsApp:\n');
  
  // Exibir QR code no terminal
  qrcode.generate(qr, { small: true });
  
  console.log('\n=== FIM DO QR CODE ===\n');
});

// Evento: Cliente autenticado com sucesso
client.on('authenticated', () => {
  console.log('✓ Cliente autenticado com sucesso!');
});

// Evento: Cliente pronto para usar
client.on('ready', () => {
  console.log('✓ Cliente WhatsApp pronto!');
  console.log(`Usuário conectado como: ${client.info?.pushname}`);
  
  // Aqui você pode usar o cliente para outras operações
  // Exemplo: client.sendMessage(number, 'Olá!');
});

// Evento: Mensagem recebida
client.on('message', (message) => {
  console.log(`\n[${message.from}]: ${message.body}`);
  
  // Responder automaticamente como exemplo
  if (message.body === '!ping') {
    message.reply('pong');
  }
});

// Evento: Cliente desconectado
client.on('disconnected', () => {
  console.log('✗ Cliente desconectado');
  process.exit(0);
});

// Evento: Erro
client.on('error', (error) => {
  console.error('✗ Erro:', error);
});

// ==================== INICIALIZAR ====================

console.log('🚀 Iniciando cliente WhatsApp...');
client.initialize();
