import { isBot } from "@/lib/tracking";

// Headers CORS para permitir requisições cross-origin
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Mock data - você vai conectar isso ao banco depois
const mockEvents = [
  {
    id: "1",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    event: "page_view",
    visitor_id: "c4c320a6-9d6d-43e5-83ad-baa68f321295",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1",
    phone: "(11) 98765-4321",
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "promo_abril",
    utm_content: "v1",
    gclid: "CjwKCAj4e48Aaa1test...",
  },
  {
    id: "2",
    created_at: new Date(Date.now() - 2400000).toISOString(),
    event: "page_view",
    visitor_id: "a1b2c3d4-e5f6-4789-0abc-def123456789",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    phone: "",
    utm_source: "facebook",
    utm_medium: "social",
    utm_campaign: "summer_sale",
  },
  {
    id: "3",
    created_at: new Date(Date.now() - 1800000).toISOString(),
    event: "form_submit",
    visitor_id: "c4c320a6-9d6d-43e5-83ad-baa68f321295",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1",
    phone: "(11) 98765-4321",
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "promo_abril",
  },
  {
    id: "4",
    created_at: new Date(Date.now() - 1200000).toISOString(),
    event: "page_view",
    visitor_id: "xyz789abc-def0-1234-5678-abcdef123456",
    user_agent: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.164 Mobile Safari/537.36 (compatible; AdsBot-Google-Mobile; +http://www.google.com/mobile/adsbot.html)",
    phone: "",
    utm_source: "google",
    utm_medium: "cpc",
  },
  {
    id: "5",
    created_at: new Date(Date.now() - 600000).toISOString(),
    event: "page_view",
    visitor_id: "visitor-real-001",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    phone: "",
    utm_source: "instagram",
    utm_medium: "social",
    utm_campaign: "influencer_collab",
    fbclid: "IwAR3test123...",
  },
];

export async function GET() {
  try {
    // Formatar dados e adicionar is_bot
    const events = mockEvents
      .map((e) => ({
        ...e,
        is_bot: isBot(e.user_agent),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

    const { created_at, event, visitor_id, user_agent, ...utmParams } = body;

    // Validar campos obrigatórios
    if (!created_at || !event || !visitor_id || !user_agent) {
      return Response.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Detectar se é bot
    const is_bot = isBot(user_agent);

    // Aqui você vai salvar no banco de dados
    const trackingEvent = {
      id: crypto.randomUUID(),
      created_at,
      event,
      visitor_id,
      user_agent,
      is_bot,
      ...utmParams,
    };

    // TODO: Salvar no banco de dados
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
