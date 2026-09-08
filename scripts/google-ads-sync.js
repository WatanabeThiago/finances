/**
 * GOOGLE ADS SCRIPT: Sincronização Automática com /daily-ads
 * 
 * INSTRUÇÕES:
 * 1. Acesse sua conta do Google Ads (https://ads.google.com).
 * 2. No menu superior ou lateral, vá em: "Ferramentas" (ou Ferramentas e Configurações) > "Scripts".
 * 3. Clique no botão "+" azul para criar um novo script.
 * 4. Apague qualquer código existente no editor e cole todo este arquivo.
 * 5. Ajuste as variáveis de CONFIGURAÇÃO abaixo (API_URL e API_KEY se configurada).
 * 6. Clique em "Autorizar" para permitir que o script leia métricas e faça requisições HTTP.
 * 7. Clique em "Visualizar" ou "Executar" para testar.
 * 8. Na listagem de Scripts, configure a "Frequência" para "Diariamente" às "10:00".
 */

// ==========================================
// 1. CONFIGURAÇÕES
// ==========================================
var CONFIG = {
  // URL da API do seu sistema (ajuste se seu domínio for diferente)
  API_URL: "https://finances-beige.vercel.app/api/daily-ads",

  // Chave de API secreta (se você configurou DAILY_ADS_API_KEY no .env / Vercel)
  // Se não configurou DAILY_ADS_API_KEY, pode deixar em branco ""
  API_KEY: "",

  // Quantidade de dias para sincronizar (recomendado: 2 -> Ontem e Anteontem)
  // Como vocês são chaveiro 24h com cliques até 23h59, sincronizar D-1 e D-2
  // garante que cliques tardios e filtros de cliques inválidos do Google sejam atualizados.
  DAYS_TO_SYNC: 2,

  // Fuso horário preferido caso a conta não tenha timezone configurado
  DEFAULT_TIMEZONE: "America/Sao_Paulo"
};

// ==========================================
// 2. FUNÇÃO PRINCIPAL (EXECUTADA PELO GOOGLE)
// ==========================================
function main() {
  Logger.log("=== INICIANDO SINCRONIZAÇÃO GOOGLE ADS -> FINANCES ===");

  var timeZone = CONFIG.DEFAULT_TIMEZONE;
  try {
    timeZone = AdsApp.currentAccount().getTimeZone() || CONFIG.DEFAULT_TIMEZONE;
  } catch (e) {
    Logger.log("Aviso: usando timezone padrão " + timeZone);
  }

  var now = new Date();
  var records = [];

  // Itera pelos dias retroativos (1 = ontem, 2 = anteontem)
  for (var i = 1; i <= CONFIG.DAYS_TO_SYNC; i++) {
    var targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    var dateString = Utilities.formatDate(targetDate, timeZone, "dd/MM/yyyy");
    var dateParam = Utilities.formatDate(targetDate, timeZone, "yyyyMMdd");

    var stats = AdsApp.currentAccount().getStatsFor(dateParam, dateParam);
    var spend = stats.getCost();
    var impressions = stats.getImpressions();
    var clicks = stats.getClicks();
    var cpc = clicks > 0 ? (spend / clicks) : 0;

    Logger.log("Data: " + dateString + 
               " | Gasto: R$ " + spend.toFixed(2) + 
               " | CPC: R$ " + cpc.toFixed(2) + 
               " | Impressões: " + impressions + 
               " | Cliques: " + clicks);

    records.push({
      date: dateString,
      spend: Number(spend.toFixed(2)),
      cpc: Number(cpc.toFixed(2)),
      impressions: impressions
    });
  }

  if (records.length === 0) {
    Logger.log("Nenhum registro para sincronizar.");
    return;
  }

  Logger.log("Enviando " + records.length + " dia(s) para a API: " + CONFIG.API_URL);

  var headers = {
    "Content-Type": "application/json"
  };

  if (CONFIG.API_KEY && CONFIG.API_KEY.trim().length > 0) {
    headers["x-api-key"] = CONFIG.API_KEY.trim();
  }

  var options = {
    method: "post",
    headers: headers,
    payload: JSON.stringify(records),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(CONFIG.API_URL, options);
    var statusCode = response.getResponseCode();
    var responseBody = response.getContentText();

    if (statusCode >= 200 && statusCode < 300) {
      Logger.log(">>> SUCESSO! Dados atualizados no Finances com êxito!");
      Logger.log("Resposta: " + responseBody);
    } else {
      Logger.log(">>> ERRO ao enviar dados. Status: " + statusCode);
      Logger.log("Resposta do servidor: " + responseBody);
    }
  } catch (err) {
    Logger.log(">>> FALHA na requisição HTTP: " + err.toString());
  }

  Logger.log("=== SINCRONIZAÇÃO FINALIZADA ===");
}
