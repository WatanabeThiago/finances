/**
 * Classe para gerenciar erros da integração WhatsApp
 */

export class WhatsAppError extends Error {
  public code: string;
  public timestamp: number;

  constructor(message: string, code: string = 'WHATSAPP_ERROR') {
    super(message);
    this.name = 'WhatsAppError';
    this.code = code;
    this.timestamp = Date.now();
  }
}

export class WhatsAppAuthError extends WhatsAppError {
  constructor(message: string = 'Falha na autenticação') {
    super(message, 'AUTH_ERROR');
    this.name = 'WhatsAppAuthError';
  }
}

export class WhatsAppConnectionError extends WhatsAppError {
  constructor(message: string = 'Erro de conexão') {
    super(message, 'CONNECTION_ERROR');
    this.name = 'WhatsAppConnectionError';
  }
}

export class WhatsAppInitializationError extends WhatsAppError {
  constructor(message: string = 'Erro ao inicializar cliente') {
    super(message, 'INITIALIZATION_ERROR');
    this.name = 'WhatsAppInitializationError';
  }
}

export const WhatsAppErrors = {
  BROWSER_LAUNCH_FAILED: new WhatsAppInitializationError('Falha ao iniciar o navegador'),
  ALREADY_INITIALIZING: new WhatsAppInitializationError('Cliente já está inicializando'),
  SESSION_INVALID: new WhatsAppAuthError('Sessão inválida ou expirada'),
  NO_INTERNET: new WhatsAppConnectionError('Sem conexão com a internet'),
  ACCOUNT_LOCKED: new WhatsAppAuthError('Conta bloqueada após múltiplas tentativas'),
};

export function createWhatsAppError(
  message: string,
  originalError?: Error
): WhatsAppError {
  if (originalError?.message?.includes('Timeout')) {
    return new WhatsAppConnectionError(message);
  }
  if (originalError?.message?.includes('auth')) {
    return new WhatsAppAuthError(message);
  }
  return new WhatsAppError(message);
}
