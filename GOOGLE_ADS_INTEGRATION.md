# Integração Automática: Google Ads -> Finances (/daily-ads)

Esta integração automatiza o registro diário de desempenho de anúncios (Gasto, CPC e Impressões) no painel `/daily-ads` através do recurso nativo **Google Ads Scripts**.

---

## Por que às 10:00 da manhã e últimos 7 dias?
Como vocês são chaveiro 24h e recebem cliques até as 23:59, rodar o script às 10:00 da manhã garante que:
1. O dia de ontem (D-1) já encerrou completamente.
2. O Google Ads já teve tempo de consolidar cliques tardios e filtrar cliques inválidos.
3. O script sincroniza os **últimos 7 dias** (desde ontem D-1 até 7 dias atrás D-7), de modo que qualquer ajuste ou estorno feito pelo Google Ads ao longo da semana é atualizado automaticamente no sistema sem intervenção manual.

---

## Passo a Passo para Ativar no Google Ads

### 1. Acesse o Painel de Scripts do Google Ads
1. Faça login na sua conta do [Google Ads](https://ads.google.com).
2. No menu de navegação, clique no ícone **Ferramentas** (ou **Ferramentas e Configurações**).
3. Na coluna de ações em massa / automações, clique em **Scripts**.

### 2. Crie um Novo Script
1. Clique no botão azul com sinal de mais **(+)** para criar um novo script.
2. No campo do título (onde diz "Script sem título"), nomeie como: `Sincronização Diária Finances`.
3. Apague todo o código padrão do editor.
4. Abra o arquivo `scripts/google-ads-sync.js` deste repositório, copie todo o conteúdo e cole no editor do Google Ads.

### 3. Ajuste as Configurações (se necessário)
No topo do script colado:
- `API_URL`: Verifique se a URL da sua aplicação Vercel está correta (`https://finances-beige.vercel.app/api/daily-ads`).
- `API_KEY`: Se você configurou a variável de ambiente `DAILY_ADS_API_KEY` na Vercel, insira o mesmo valor aqui. Se não configurou, pode deixar vazio `""`.

### 4. Autorize e Teste
1. Clique no botão **Autorizar** que aparece na barra inferior (o Google Ads vai pedir permissão para ler dados da conta e fazer conexões externas).
2. Clique no botão **Visualizar** ou **Executar** para fazer um teste imediato.
3. Veja o painel de **Registros (Logs)** na parte inferior: você verá os valores de ontem e anteontem sendo calculados e a resposta `>>> SUCESSO! Dados atualizados no Finances com êxito!`.
4. Abra a tela `/daily-ads` do seu sistema e confira que os dados já estarão preenchidos!

### 5. Agende a Frequência para as 10:00 da manhã
1. Volte para a lista de **Scripts**.
2. Na linha do script recém-criado, localize a coluna **Frequência** (por padrão estará como "Nenhuma").
3. Clique no lápis para editar e selecione:
   - **Frequência:** Diariamente
   - **Horário:** 10:00 - 11:00
4. Clique em **Salvar**.

Pronto! A partir de agora, todo dia às 10h da manhã os dados serão coletados e atualizados automaticamente.
