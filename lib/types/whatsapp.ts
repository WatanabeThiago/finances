/**
 * Types para integração WhatsApp Web.js
 */

export interface WhatsAppClientConfig {
  clientId: string;
  authPath?: string;
  headless?: boolean;
  disableGpu?: boolean;
}

export interface WhatsAppClientStatus {
  isReady: boolean;
  isInitializing: boolean;
  error?: string;
  phoneNumber?: string;
  username?: string;
}

export interface QRCodeEvent {
  qr: string;
  timestamp: number;
  expiresIn?: number;
}

export interface WhatsAppMessage {
  from: string;
  to: string;
  body: string;
  timestamp: number;
  isFromMe: boolean;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'contact';
}

export interface WhatsAppConnectionEvent {
  type: 'qr' | 'authenticated' | 'ready' | 'disconnected' | 'error';
  data?: any;
  timestamp: number;
}

export enum WhatsAppEventType {
  QR_CODE = 'qr',
  AUTHENTICATED = 'authenticated',
  READY = 'ready',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  MESSAGE = 'message',
}
