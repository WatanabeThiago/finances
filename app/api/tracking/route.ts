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
    const events = await query(
      `SELECT 
        id,
        "createdAt" as created_at,
        event,
        "visitorId" as visitor_id,
        "userAgent" as user_agent,
        phone,
        "utmSource" as utm_source,
        "utmMedium" as utm_medium,
        "utmCampaign" as utm_campaign,
        "utmContent" as utm_content,
        "utmTerm" as utm_term,
        gclid,
        fbclid,
        "isBot" as is_bot
       FROM public."Tracking"
       ORDER BY "createdAt" DESC`
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
      created_at, 
      event, 
      visitor_id, 
      user_agent,
      phone = "",
      utm_source = null,
      utm_medium = null,
      utm_campaign = null,
      utm_content = null,
      utm_term = null,
      gclid = null,
      fbclid = null,
    } = body;

    // Validar campos obrigatórios
    if (!created_at || !event || !visitor_id || !user_agent) {
      return Response.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Detectar se é bot
    const is_bot = isBot(user_agent);

    // Salvar no banco de dados
    const result = await query(
      `INSERT INTO public."Tracking" (
        "createdAt",
        event,
        "visitorId",
        "userAgent",
        phone,
        "utmSource",
        "utmMedium",
        "utmCampaign",
        "utmContent",
        "utmTerm",
        gclid,
        fbclid,
        "isBot"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING 
        id,
        "createdAt" as created_at,
        event,
        "visitorId" as visitor_id,
        "userAgent" as user_agent,
        phone,
        "utmSource" as utm_source,
        "utmMedium" as utm_medium,
        "utmCampaign" as utm_campaign,
        "utmContent" as utm_content,
        "utmTerm" as utm_term,
        gclid,
        fbclid,
        "isBot" as is_bot`,
      [
        created_at,
        event,
        visitor_id,
        user_agent,
        phone,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        gclid,
        fbclid,
        is_bot,
      ]
    );

    const trackingEvent = result[0];
    console.log("Evento de tracking registrado:", trackingEvent);

    return Response.json(trackingEvent, { 
      status: 201, 
      headers: corsHeaders 
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
