import { query } from "@/lib/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  try {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    // Buscar eventos dos últimos 2 minutos
    const events = await query(
      `SELECT 
        t.id,
        to_char(t."createdAt" AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI:SS') as created_at,
        t.event,
        t."visitorId" as visitor_id,
        s.phone
       FROM public."Tracking" t
       LEFT JOIN public."TrackingSession" s ON t."visitorId" = s."visitorId"
       WHERE t."createdAt" >= $1
       ORDER BY t."createdAt" DESC`,
      [twoMinutesAgo.toISOString()]
    );

    return Response.json(events, { headers: corsHeaders });
  } catch (error) {
    console.error("Erro ao buscar eventos recentes:", error);
    return Response.json(
      { error: "Falha ao buscar eventos" },
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
