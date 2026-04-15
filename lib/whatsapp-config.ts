/**
 * Configuração centralizada para WhatsApp Web.js
 */

export const WHATSAPP_CONFIG = {
  // Identificador do cliente
  CLIENT_ID: process.env.WHATSAPP_CLIENT_ID || 'whatsapp-bot',

  // Caminho para salvar autenticação
  AUTH_PATH: process.env.WHATSAPP_AUTH_PATH || '.wwebjs_auth',

  // Configurações do Puppeteer
  PUPPETEER: {
    HEADLESS: process.env.WHATSAPP_HEADLESS !== 'false',
    DISABLE_GPU: true,
    DISABLE_DEV_SHM: true,
    NO_SANDBOX: true,
    SINGLE_PROCESS: false, // Não recomendado para produção
  },

  // Timeouts
  INITIALIZATION_TIMEOUT: 60000, // 60 segundos
  QR_CODE_TIMEOUT: 120000, // 2 minutos
  CONNECTION_TIMEOUT: 30000, // 30 segundos

  // Configurações de retry
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000, // 5 segundos

  // Logging
  DEBUG: process.env.WHATSAPP_DEBUG === 'true',
  LOG_LEVEL: (process.env.WHATSAPP_LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug',

  // Comportamento
  AUTO_RECONNECT: true,
  RECONNECT_DELAY: 10000, // 10 segundos
  SESSION_EXPIRY_HOURS: 24 * 30, // 30 dias

  // Limites
  MESSAGE_RATE_LIMIT: 5, // mensagens por segundo
  MAX_QR_HISTORY: 10,

  // Features
  ENABLE_QR_CODE: true,
  ENABLE_MESSAGE_STORAGE: process.env.WHATSAPP_STORE_MESSAGES === 'true',
  ENABLE_EVENT_LOGGING: process.env.WHATSAPP_LOG_EVENTS === 'true',
};

/**
 * Validar configuração na inicialização
 */
export function validateWhatsAppConfig(): string[] {
  const errors: string[] = [];

  if (!WHATSAPP_CONFIG.CLIENT_ID) {
    errors.push('WHATSAPP_CLIENT_ID não configurado');
  }

  if (WHATSAPP_CONFIG.MAX_RETRIES < 1) {
    errors.push('MAX_RETRIES deve ser maior que 0');
  }

  return errors;
}

/**
 * Obter configurações com overrides
 */
export function getWhatsAppConfig(overrides: Partial<typeof WHATSAPP_CONFIG> = {}) {
  return {
    ...WHATSAPP_CONFIG,
    ...overrides,
  };
}
