# WhatsApp Web.js Integration - Quick Start Guide

Integração completa com **whatsapp-web.js** para conectar e ler QR code do WhatsApp no seu aplicativo Next.js.

## ✅ O que foi criado

### 1. **Bibliotecas **
- ✓ `whatsapp-web.js` - Biblioteca principal
- ✓ `qrcode-terminal` - Exibição de QR code no terminal

### 2. **Arquivos de Código**

#### Core
- **[lib/whatsapp-client.ts](lib/whatsapp-client.ts)** - Cliente WhatsApp principal
  - Inicializa conexão
  - Gerencia sessões
  - Emite eventos de autenticação

- **[lib/whatsapp-config.ts](lib/whatsapp-config.ts)** - Configurações centralizadas
  - Timeouts
  - Retry logic
  - Seleção de features

- **[lib/whatsapp-errors.ts](lib/whatsapp-errors.ts)** - Tratamento de erros
  - Classes customizadas de erro
  - Categorização por tipo

- **[lib/whatsapp-qr-manager.ts](lib/whatsapp-qr-manager.ts)** - Gerenciador de QR codes
  - Histórico de QR codes
  - Conversão de formatos

- **[lib/types/whatsapp.ts](lib/types/whatsapp.ts)** - Type definitions
  - Interfaces TypeScript
  - Enums

#### API Routes
- **[app/api/whatsapp/route.ts](app/api/whatsapp/route.ts)** - API REST
  - `GET /api/whatsapp?action=init` - Inicializar
  - `GET /api/whatsapp?action=status` - Status

#### Pages
- **[app/whatsapp/page.tsx](app/whatsapp/page.tsx)** - Interface Web
  - Dashboard de conexão
  - Exibição de QR code
  - Status em tempo real

#### Exemplos
- **[examples/whatsapp-basic-usage.ts](examples/whatsapp-basic-usage.ts)** - Exemplo básico

#### Testes
- **[__tests__/whatsapp.test.ts](__tests__/whatsapp.test.ts)** - Testes de unidade

#### Banco de Dados
- **[migrations/whatsapp-schema.sql](migrations/whatsapp-schema.sql)** - Schema PostgreSQL

### 3. **Configurações**
- ✓ Navegação atualizada com link WhatsApp
- ✓ `.gitignore` atualizado (`.wwebjs_auth/` ignorado)
- ✓ `.env` ready (adicione variáveis conforme necessário)

---

## 🚀 Como Usar

### 1️⃣ **Interface Web (Recomendado)**

1. Inicie o servidor dev:
   ```bash
   npm run dev
   ```

2. Acesse `http://localhost:3000/whatsapp`

3. Clique em **"Iniciar Conexão"**

4. Escaneie o QR code com seu WhatsApp

5. Aguarde "Cliente pronto!"

### 2️⃣ **Via API**

```bash
# Inicializar
curl "http://localhost:3000/api/whatsapp?action=init"

# Verificar status
curl "http://localhost:3000/api/whatsapp?action=status"
```

### 3️⃣ **No Código TypeScript**

```typescript
import { initializeWhatsAppClient } from '@/lib/whatsapp-client';

// Conectar
const client = await initializeWhatsAppClient();

// Escutar eventos
client.on('message', (msg) => {
  console.log(msg.body);
});

// Enviar mensagem
await client.sendMessage('5585987654321@c.us', 'Olá!');
```

---

## 📋 Variáveis de Ambiente

Crie um arquivo `.env.local` com:

```env
# WhatsApp Configuration
WHATSAPP_CLIENT_ID=whatsapp-bot
WHATSAPP_DEBUG=false
WHATSAPP_LOG_LEVEL=info
WHATSAPP_HEADLESS=true
WHATSAPP_STORE_MESSAGES=false
WHATSAPP_LOG_EVENTS=false
```

---

## 📂 Estrutura de Diretórios

```
lib/
  ├── whatsapp-client.ts      # Cliente principal
  ├── whatsapp-config.ts      # Configurações
  ├── whatsapp-errors.ts      # Erros customizados
  ├── whatsapp-qr-manager.ts  # Gerenciador de QR
  └── types/
      └── whatsapp.ts         # Type definitions

app/
  ├── api/
  │   └── whatsapp/
  │       └── route.ts        # API endpoints
  └── whatsapp/
      └── page.tsx            # Interface web

migrations/
  └── whatsapp-schema.sql     # Schema do banco

__tests__/
  └── whatsapp.test.ts        # Testes

examples/
  └── whatsapp-basic-usage.ts # Exemplo de uso
```

---

## 🔐 Segurança

### ⚠️ Importante
- Pasta `.wwebjs_auth/` contém dados de autenticação sensíveis
- ✓ Já está no `.gitignore`
- Nunca commite essa pasta
- Não a coloque em repositórios públicos

### Boas Práticas
- Use variáveis de ambiente para configurações sensíveis
- Valide números de telefone antes de enviar
- Não abuse do rate limit (WhatsApp pode bloquear)
- Use credenciais diferentes para desenvolvimento e produção

---

## 🎯 Próximos Passos

### ✅ Básico (Já implementado)
- [x] Conectar com WhatsApp
- [x] Exibir QR code
- [x] Gerenciar sessão
- [x] Interface web

### 🔄 Intermediário
- [ ] Enviar/receber mensagens
- [ ] Armazenar mensagens no DB
- [ ] Webhooks para eventos
- [ ] Dashboard de conversas
- [ ] Automações (replies, etc)

### 🔧 Avançado
- [ ] Multi-instância (vários clientes)
- [ ] Painel administrativo
- [ ] Integração com CRM
- [ ] AI para respostas automáticas
- [ ] Analytics de mensagens

---

## 📚 Documentação

- [Guia Oficial](https://guide.wwebjs.dev/)
- [API Documentation](https://docs.wwebjs.dev/)
- [Discord Community](https://discord.wwebjs.dev/)
- [GitHub Repository](https://github.com/wwebjs/whatsapp-web.js)

---

## ⚡ Troubleshooting

### QR Code não aparece
```
→ Verifique se servidor está rodando
→ Verifique console logs
→ Tente reiniciar (Ctrl+C e npm run dev)
```

### "Already initializing"
```
→ Cliente já está inicializando
→ Aguarde alguns segundos
→ Não clique múltiplas vezes no botão
```

### WhatsApp bloqueia a conexão
```
→ Use um intervalo entre requisições
→ Não tente conectar do mesmo IP várias vezes
→ Aguarde 1-2 horas antes de tentar novamente
```

### Erro de Puppeteer
```
→ Instale Chrome/Chromium no sistema
→ Ou configure: export PUPPETEER_SKIP_DOWNLOAD=true
```

---

## 📞 Suporte

Para dúvidas específicas sobse a biblioteca `whatsapp-web.js`, consulte:
- Discord: https://discord.wwebjs.dev/
- Issues: https://github.com/wwebjs/whatsapp-web.js/issues

Para questões sobre a integração neste projeto, cheque:
- [WHATSAPP_SETUP.md](WHATSAPP_SETUP.md)
- [lib/whatsapp-client.ts](lib/whatsapp-client.ts)
- [examples/whatsapp-basic-usage.ts](examples/whatsapp-basic-usage.ts)
