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

  // Quantidade de dias retroativos para sincronizar (7 dias)
  // Sincroniza desde ontem (D-1) até 7 dias atrás (D-7),
  // garantindo que toda a última semana esteja sempre atualizada com o Google Ads.
  DAYS_TO_SYNC: 7,

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

    // Segmentação por tipo de clique (URL do site, Chamada direta, WhatsApp/Mensagem)
    var dateHyphen = Utilities.formatDate(targetDate, timeZone, "yyyy-MM-dd");
    var urlClicks = 0;
    var callClicks = 0;
    var msgClicks = 0;

    try {
      // Consulta GAQL no Google Ads Scripts moderno
      var query = "SELECT segments.click_type, metrics.clicks " +
                  "FROM customer " +
                  "WHERE segments.date = '" + dateHyphen + "'";
      var report = AdsApp.search(query);
      while (report.hasNext()) {
        var row = report.next();
        var clickType = row.segments.clickType;
        var typeClicks = parseInt(row.metrics.clicks || 0, 10);

        if (clickType === "URL_CLICKS") {
          urlClicks += typeClicks;
        } else if (clickType === "CALLS" || clickType === "CALL_TRACKING" || clickType === "PHONE_CALL") {
          callClicks += typeClicks;
        } else if (clickType === "MESSAGE" || clickType === "LEAD_FORM") {
          msgClicks += typeClicks;
        }
      }
    } catch (queryErr) {
      Logger.log("Aviso ao buscar segmentação de cliques para " + dateString + ": " + queryErr.toString());
      // Se não conseguir segmentar via GAQL (ex: conta não suportar ou permissão), deixa urlClicks = clicks
      urlClicks = clicks;
    }

    // Se a consulta não encontrou segmentações explícitas ou a conta teve cliques simples no site:
    if (urlClicks === 0 && callClicks === 0 && msgClicks === 0 && clicks > 0) {
      urlClicks = clicks;
    }

    Logger.log("Data: " + dateString + 
               " | Gasto: R$ " + spend.toFixed(2) + 
               " | CPC: R$ " + cpc.toFixed(2) + 
               " | Impressões: " + impressions + 
               " | Cliques Totais: " + clicks +
               " (Site: " + urlClicks + " | Ligações: " + callClicks + " | Whats: " + msgClicks + ")");

    records.push({
      date: dateString,
      spend: Number(spend.toFixed(2)),
      cpc: Number(cpc.toFixed(2)),
      impressions: impressions,
      urlClicks: urlClicks,
      callClicks: callClicks,
      msgClicks: msgClicks
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
