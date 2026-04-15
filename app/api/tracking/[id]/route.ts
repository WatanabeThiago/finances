import { NextRequest } from "next/server";
import { query } from "@/lib/db";

// Headers CORS para permitir requisições cross-origin
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { phone } = body;

    if (!phone || !phone.trim()) {
      return Response.json(
        { error: "Telefone requerido" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Atualizar no banco de dados
    const result = await query(
      `UPDATE public."Tracking"
       SET phone = $1, "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $2
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
         "isBot" as is_bot,
         "updatedAt" as updated_at`,
      [phone.trim(), id]
    );

    if (!result.length) {
      return Response.json(
        { error: "Evento não encontrado" },
        { status: 404, headers: corsHeaders }
      );
    }

    console.log(`Atualizado telefone do evento ${id}:`, phone);
    return Response.json(result[0], { headers: corsHeaders });
  } catch (error) {
    console.error("Erro ao atualizar telefone:", error);
    return Response.json(
      { error: "Falha ao atualizar telefone" },
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
