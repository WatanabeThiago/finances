import { isBot } from "@/lib/tracking";
import { query } from "@/lib/db";
import { sendApiAlert } from "@/lib/apialerts";

// Headers CORS para permitir requisições cross-origin
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  try {
    // Retorna eventos com dados da sessão
    const events = await query(
      `SELECT 
        t.id,
        to_char(t."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        t.event,
        t."visitorId" as visitor_id,
        t."userAgent" as user_agent,
        t."isBot" as is_bot,
        s.phone,
        s.venda,
        s."utmSource" as utm_source,
        s."utmMedium" as utm_medium,
        s."utmCampaign" as utm_campaign,
        s."utmContent" as utm_content,
        s."utmTerm" as utm_term,
        s.gclid,
        s.fbclid,
        s.msclkid,
        s.gad_source,
        s.gad_campaignid,
        s.gbraid,
        s.keyword,
        s.device,
        s.matchtype,
        s.network,
        s."group",
        to_char(s."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as session_created_at,
        to_char(s."updatedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as session_updated_at
       FROM public."Tracking" t
       LEFT JOIN public."TrackingSession" s ON t."visitorId" = s."visitorId"
       ORDER BY t."createdAt" DESC`
    );

    return Response.json(events, { headers: corsHeaders });
  } catch (error) {
    console.error("Erro ao buscar eventos:", error);
    return Response.json(
      { error: "Falha ao buscar eventos" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      event,
      visitor_id,
      user_agent,
      // Parâmetros de sessão
      phone = null,
      utm_source = null,
      utm_medium = null,
      utm_campaign = null,
      utm_content = null,
      utm_term = null,
      gclid = null,
      fbclid = null,
      msclkid = null,
      // Novos parâmetros Google Ads
      gad_source = null,
      gad_campaignid = null,
      gbraid = null,
      keyword = null,
      device = null,
      matchtype = null,
      network = null,
      group = null,
    } = body;

    // Obter telefone se presente em qualquer formato
    const effectivePhone =
      phone || body.phone_number || body.phone_formatted || null;

    // Validar campos obrigatórios
    if (!event || !visitor_id || !user_agent) {
      return Response.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Quem tem gclid/fbclid/msclkid clicou num anúncio — nunca é bot
    const is_bot = isBot(user_agent) && !gclid && !fbclid && !msclkid;

    // UPSERT na sessão do visitante
    await query(
      `INSERT INTO public."TrackingSession" (
        "visitorId",
        phone,
        "utmSource",
        "utmMedium",
        "utmCampaign",
        "utmContent",
        "utmTerm",
        gclid,
        fbclid,
        msclkid,
        gad_source,
        gad_campaignid,
        gbraid,
        keyword,
        device,
        matchtype,
        network,
        "group"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT ("visitorId") DO UPDATE SET
        phone = COALESCE(EXCLUDED.phone, public."TrackingSession".phone),
        "utmSource" = COALESCE(EXCLUDED."utmSource", public."TrackingSession"."utmSource"),
        "utmMedium" = COALESCE(EXCLUDED."utmMedium", public."TrackingSession"."utmMedium"),
        "utmCampaign" = COALESCE(EXCLUDED."utmCampaign", public."TrackingSession"."utmCampaign"),
        "utmContent" = COALESCE(EXCLUDED."utmContent", public."TrackingSession"."utmContent"),
        "utmTerm" = COALESCE(EXCLUDED."utmTerm", public."TrackingSession"."utmTerm"),
        gclid = COALESCE(EXCLUDED.gclid, public."TrackingSession".gclid),
        fbclid = COALESCE(EXCLUDED.fbclid, public."TrackingSession".fbclid),
        msclkid = COALESCE(EXCLUDED.msclkid, public."TrackingSession".msclkid),
        gad_source = COALESCE(EXCLUDED.gad_source, public."TrackingSession".gad_source),
        gad_campaignid = COALESCE(EXCLUDED.gad_campaignid, public."TrackingSession".gad_campaignid),
        gbraid = COALESCE(EXCLUDED.gbraid, public."TrackingSession".gbraid),
        keyword = COALESCE(EXCLUDED.keyword, public."TrackingSession".keyword),
        device = COALESCE(EXCLUDED.device, public."TrackingSession".device),
        matchtype = COALESCE(EXCLUDED.matchtype, public."TrackingSession".matchtype),
        network = COALESCE(EXCLUDED.network, public."TrackingSession".network),
        "group" = COALESCE(EXCLUDED."group", public."TrackingSession"."group"),
        "updatedAt" = CURRENT_TIMESTAMP`,
      [
        visitor_id,
        effectivePhone,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        gclid,
        fbclid,
        msclkid,
        gad_source,
        gad_campaignid,
        gbraid,
        keyword,
        device,
        matchtype,
        network,
        group,
      ]
    );

    // Inserir evento (createdAt gerado automaticamente pelo banco)
    const result = await query(
      `INSERT INTO public."Tracking" (
        event,
        "visitorId",
        "userAgent",
        "isBot"
      ) VALUES ($1, $2, $3, $4)
      RETURNING 
        id,
        to_char("createdAt" AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI:SS') as created_at,
        event,
        "visitorId" as visitor_id,
        "userAgent" as user_agent,
        "isBot" as is_bot`,
      [event, visitor_id, user_agent, is_bot]
    );

    const trackingEvent = result[0];
    console.log("Evento de tracking registrado:", trackingEvent);

    // Processar notificações push no celular via ApiAlerts (apenas visitantes reais)
    if (!is_bot) {
      const termDisplay = keyword || utm_term || "";
      const deviceLabel =
        device === "m"
          ? "📱 Celular"
          : device === "d" || device === "t"
          ? "💻 Computador"
          : device === "c"
          ? "📱 Tablet"
          : "";

      const isAdLead = Boolean(
        gclid || fbclid || msclkid || gad_source || keyword || utm_term
      );

      let shouldAlert = false;
      let alertEventName = `lead.${event}`;
      let alertTitle = "";
      let alertMessage = "";
      let alertTags: string[] = [];

      if (event === "page_view" && isAdLead) {
        // Verificar se já houve page_view deste visitante nos últimos 15 min para não duplicar notificação
        const recentPageViews = await query(
          `SELECT id FROM public."Tracking" 
           WHERE "visitorId" = $1 AND event = 'page_view' 
             AND "createdAt" >= NOW() - INTERVAL '15 minutes'
             AND id != $2
           LIMIT 1`,
          [visitor_id, trackingEvent.id]
        );

        if (recentPageViews.length === 0) {
          shouldAlert = true;
          const termoText = termDisplay ? `"${termDisplay}"` : "Anúncio Google Ads";
          alertTitle = `👀 Lead no Site: ${termDisplay || "Google Ads"}`;
          alertMessage = `Novo visitante buscando ${termoText}. ${deviceLabel ? `(${deviceLabel}) ` : ""}Fique de prontidão, pode chamar a qualquer momento!`;
          alertTags = ["visita", "google-ads", "lead"];
        }
      } else if (
        event === "click" ||
        event === "whatsapp_click" ||
        event === "automotive_whatsapp_click" ||
        event === "board_repair_whatsapp_click"
      ) {
        shouldAlert = true;
        alertEventName = "lead.whatsapp";
        alertTitle = "📲 Clique no WhatsApp!";
        alertMessage = `Lead clicou no botão do WhatsApp! ${termDisplay ? `Busca: "${termDisplay}". ` : ""}${deviceLabel ? `Dispositivo: ${deviceLabel}. ` : ""}Prepare-se para atender!`;
        alertTags = ["whatsapp", "lead", "conversao"];
      } else if (
        event === "call" ||
        event === "call_click" ||
        event === "automotive_call_click" ||
        event === "board_repair_call_click"
      ) {
        shouldAlert = true;
        alertEventName = "lead.call";
        alertTitle = "📞 Clique para Ligar!";
        alertMessage = `Lead clicou no telefone para ligar! ${termDisplay ? `Busca: "${termDisplay}". ` : ""}${deviceLabel ? `Dispositivo: ${deviceLabel}. ` : ""}O telefone pode tocar a qualquer segundo!`;
        alertTags = ["ligacao", "lead", "conversao"];
      } else if (
        event === "submit_callback_request" ||
        event === "callback_request"
      ) {
        shouldAlert = true;
        alertEventName = "lead.callback";
        alertTitle = "🔔 Pedido de Retorno (Me Ligue)!";
        alertMessage = `Lead pediu retorno imediato! Telefone: ${effectivePhone || "Consulte o painel"}. ${termDisplay ? `Busca: "${termDisplay}".` : ""}`;
        alertTags = ["callback", "lead", "urgente"];
      } else if (event === "copy_phone_click") {
        shouldAlert = true;
        alertEventName = "lead.copy_phone";
        alertTitle = "📋 Copiou Telefone!";
        alertMessage = `Visitante copiou o número de telefone no site. ${termDisplay ? `Busca: "${termDisplay}".` : ""}`;
        alertTags = ["telefone", "lead"];
      }

      if (shouldAlert) {
        sendApiAlert({
          event: alertEventName,
          title: alertTitle,
          message: alertMessage,
          tags: alertTags,
          link: "https://finances-beige.vercel.app/tracking",
          data: {
            visitor_id,
            keyword: termDisplay || undefined,
            device: device || undefined,
            matchtype: matchtype || undefined,
            phone: effectivePhone || undefined,
          },
        }).catch((err) => {
          console.error("[ApiAlerts Tracking Error]:", err);
        });
      }
    }

    return Response.json(trackingEvent, {
      status: 201,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Erro ao processar evento:", error);
    return Response.json(
      { error: "Falha ao processar evento" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
