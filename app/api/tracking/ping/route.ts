import { query } from "@/lib/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(request: Request) {
  try {
    const { visitor_id } = await request.json();

    if (!visitor_id) {
      return Response.json({ error: "visitor_id obrigatório" }, { status: 400, headers: corsHeaders });
    }

    await query(
      `UPDATE public."TrackingSession" SET "updatedAt" = NOW() WHERE "visitorId" = $1`,
      [visitor_id]
    );

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("Erro no ping:", error);
    return Response.json({ error: "Falha no ping" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}
