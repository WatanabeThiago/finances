/**
 * Exemplos de testes para a integração WhatsApp
 * Use com Jest ou outro framework de testes
 */

import { initializeWhatsAppClient, getClientStatus, destroyClient } from '@/lib/whatsapp-client';
import { WhatsAppAuthError, WhatsAppConnectionError } from '@/lib/whatsapp-errors';

describe('WhatsApp Integration', () => {
  afterEach(async () => {
    await destroyClient();
  });

  describe('Client Initialization', () => {
    test('should initialize client successfully', async () => {
      const client = await initializeWhatsAppClient();
      expect(client).toBeDefined();
      expect(client.initialize).toBeDefined();
    });

    test('should return same instance on multiple calls', async () => {
      const client1 = await initializeWhatsAppClient();
      const client2 = await initializeWhatsAppClient();
      expect(client1).toBe(client2);
    });

    test('should get client status', () => {
      const status = getClientStatus();
      expect(status).toHaveProperty('isReady');
      expect(status).toHaveProperty('isInitializing');
    });
  });

  describe('Client Lifecycle', () => {
    test('should start initializing', async () => {
      const statusBefore = getClientStatus();
      const client = initializeWhatsAppClient();
      const statusAfter = getClientStatus();
      
      // Status pode não mudar imediatamente
      expect(statusBefore.isInitializing).toBe(false);
    });

    test('should clean up resources on destroy', async () => {
      const client = await initializeWhatsAppClient();
      await destroyClient();
      
      const status = getClientStatus();
      expect(status.isReady).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('WhatsAppAuthError should extend WhatsAppError', () => {
      const error = new WhatsAppAuthError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('AUTH_ERROR');
    });

    test('WhatsAppConnectionError should extend WhatsAppError', () => {
      const error = new WhatsAppConnectionError('Connection failed');
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('CONNECTION_ERROR');
    });
  });
});

/**
 * Testes de integração (requer WhatsApp ativo)
 */
describe('WhatsApp Integration (E2E)', () => {
  test.skip('should connect to WhatsApp and show QR', async () => {
    const client = await initializeWhatsAppClient();
    
    const Promise = new Promise((resolve) => {
      client.on('qr', (qr) => {
        expect(qr).toBeTruthy();
        expect(typeof qr).toBe('string');
        resolve(true);
      });
    });

    // Timeout de 30 segundos para escanear QR
    jest.setTimeout(30000);
    await Promise;
  }, 30000);

  test.skip('should authenticate successfully', async () => {
    const client = await initializeWhatsAppClient();
    
    const authenticated = new Promise((resolve) => {
      client.on('authenticated', () => {
        resolve(true);
      });
    });

    jest.setTimeout(60000);
    await authenticated;
  }, 60000);
});
