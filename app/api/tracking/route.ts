import { isBot } from "@/lib/tracking";
import { query } from "@/lib/db";

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
        s."group"
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

    // Validar campos obrigatórios
    if (!event || !visitor_id || !user_agent) {
      return Response.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Detectar se é bot
    const is_bot = isBot(user_agent);

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
        phone,
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
