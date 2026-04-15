# Integração WhatsApp Web.js

Integração com **whatsapp-web.js** para conectar à conta WhatsApp e exibir QR Code.

## Instalação

As dependências já foram instaladas:

```bash
npm install whatsapp-web.js qrcode-terminal
```

## Estrutura

### Arquivos Principais

1. **`lib/whatsapp-client.ts`**
   - Gerenciador principal do cliente WhatsApp
   - Funções: `initializeWhatsAppClient()`, `getWhatsAppClient()`, `getClientStatus()`
   - Trata autenticação, conexão e desconexão

2. **`lib/whatsapp-qr-manager.ts`**
   - Gerenciador de QR codes
   - Mantém histórico de QR codes gerados
   - Converte para diferentes formatos (texto, base64)

3. **`app/api/whatsapp/route.ts`**
   - API REST para controlar o cliente WhatsApp
   - Endpoints:
     - `GET /api/whatsapp?action=init` - Inicializar cliente
     - `GET /api/whatsapp?action=status` - Verificar status

4. **`app/whatsapp/page.tsx`**
   - Interface web para conectar e visualizar QR Code
   - Status da conexão em tempo real
   - Botão para iniciar a conexão

## Como Usar

### Via Interface Web

1. Acess `http://localhost:3000/whatsapp`
2. Clique em "Iniciar Conexão"
3. Aguarde a geração do QR Code
4. Escaneie com seu telefone WhatsApp
5. Aguarde a autenticação completa

### Via API

#### Inicializar cliente
```bash
curl "http://localhost:3000/api/whatsapp?action=init"
```

Resposta:
```json
{
  "success": true,
  "message": "Cliente WhatsApp inicializando...",
  "status": {
    "isReady": false,
    "isInitializing": true,
    "error": null
  },
  "qrCode": "..."
}
```

#### Verificar status
```bash
curl "http://localhost:3000/api/whatsapp?action=status"
```

Resposta:
```json
{
  "success": true,
  "status": {
    "isReady": true,
    "isInitializing": false,
    "error": null
  },
  "qrCode": null
}
```

### No Código (TypeScript)

```typescript
import { initializeWhatsAppClient } from '@/lib/whatsapp-client';

// Inicializar
const client = await initializeWhatsAppClient();

// Usar para enviar mensagens
client.sendMessage(phoneNumber, 'Olá!');

// Escutar mensagens
client.on('message', (msg) => {
  console.log(msg.body);
});
```

## Autenticação

A autenticação usa `LocalAuth` que:
- Salva a sessão automaticamente em `.wwebjs_auth/`
- Permite reusar a sessão sem escanear QR Code novamente
- Se a pasta for deletada, será necessário escanear QR Code novamente

## Segurança

- ⚠️ **Importante**: Adicione `.wwebjs_auth/` no `.gitignore`
- A pasta contém dados sensíveis de autenticação
- Nunca commitar essa pasta no repositório

## Requisitos do Sistema

- Node.js v18.0.0 ou superior
- Chrome/Chromium instalado (Puppeteer usa para controlar o navegador)
- Windows/Linux/macOS

## Troubleshooting

### QR Code não aparece
- Verifique se o cliente está realmente inicializando
- Verifique os logs do console
- Reinicie o servidor

### Conexão cai constantemente
- WhatsApp pode desligar por fraude detectada
- Aumente o intervalo entre requisições
- Não use em múltiplos locais simultaneamente

### Erro de Puppeteer
- Instale Chrome: `npm install puppeteer`
- Ou defina `PUPPETEER_SKIP_DOWNLOAD=true` e use Chrome existente

## Próximos Passos

Para expandir a integração:

1. **Enviar mensagens**: `client.sendMessage(phoneNumber, message)`
2. **Receber mensagens**: Usar evento `client.on('message', ...)`
3. **Enviar mídia**: `client.sendMessage(number, new MessageMedia(...))`
4. **Gerenciar grupos**: `client.getChats()`, `client.getChatById()`
5. **Webhooks**: Integrar com seu sistema de notificações

## Documentação

- [Guia Oficial](https://guide.wwebjs.dev/)
- [API Docs](https://docs.wwebjs.dev/)
- [Discord Community](https://discord.wwebjs.dev/)
