import { Client, LocalAuth } from 'whatsapp-web.js';
import { EventEmitter } from 'events';

export interface QRCodeEvent {
  qr: string;
  timestamp: number;
}

class WhatsAppQRManager extends EventEmitter {
  private qrHistory: QRCodeEvent[] = [];
  private maxHistorySize = 10;

  addQRCode(qr: string): void {
    const event: QRCodeEvent = {
      qr,
      timestamp: Date.now(),
    };
    
    this.qrHistory.push(event);
    
    // Manter apenas os últimos QR codes
    if (this.qrHistory.length > this.maxHistorySize) {
      this.qrHistory.shift();
    }

    this.emit('qr-generated', event);
  }

  getLatestQRCode(): QRCodeEvent | null {
    return this.qrHistory[this.qrHistory.length - 1] ?? null;
  }

  getAllQRCodes(): QRCodeEvent[] {
    return [...this.qrHistory];
  }

  clearHistory(): void {
    this.qrHistory = [];
  }

  /**
   * Converte QR code string para um formato visual em texto ASCII
   * Útil para debug no terminal
   */
  displayQRCodeInTerminal(qr: string): string {
    const lines = qr.split('\n');
    return lines.join('\n');
  }

  /**
   * Gera um QR code em formato SVG (pode ser usado em web)
   * Nota: Requer biblioteca adicional se quiser funcionalidade completa
   */
  getQRCodeDataUrl(qr: string): string {
    // Cria um data URL simples para debug
    return `data:text/plain;base64,${Buffer.from(qr).toString('base64')}`;
  }
}

export const qrManager = new WhatsAppQRManager();
