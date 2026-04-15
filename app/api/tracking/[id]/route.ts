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

    // Monta a query dinamicamente baseado no campos enviados
    const allowedFields = [
      "phone",
      "venda",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "gclid",
      "fbclid",
      "msclkid",
      "gad_source",
      "gad_campaignid",
      "gbraid",
      "keyword",
      "device",
      "matchtype",
      "network",
      "group",
    ];

    const fieldMapping: Record<string, string> = {
      phone: "phone",
      venda: "venda",
      utm_source: '"utmSource"',
      utm_medium: '"utmMedium"',
      utm_campaign: '"utmCampaign"',
      utm_content: '"utmContent"',
      utm_term: '"utmTerm"',
      gclid: "gclid",
      fbclid: "fbclid",
      msclkid: "msclkid",
      gad_source: "gad_source",
      gad_campaignid: "gad_campaignid",
      gbraid: "gbraid",
      keyword: "keyword",
      device: "device",
      matchtype: "matchtype",
      network: "network",
      group: '"group"',
    };

    const updateClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Construir SET clauses
    Object.entries(body).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        updateClauses.push(`${fieldMapping[key]} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    if (updateClauses.length === 0) {
      return Response.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400, headers: corsHeaders }
      );
    }

    updateClauses.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    params.push(id);

    // ID é visitor_id ou event id? Vou tentar primeiro como visitor_id na sessão
    const result = await query(
      `UPDATE public."TrackingSession"
       SET ${updateClauses.join(", ")}
       WHERE "visitorId" = $${paramIndex}
       RETURNING 
         id,
         "visitorId" as visitor_id,
         phone,
         venda,
         "utmSource" as utm_source,
         "utmMedium" as utm_medium,
         "utmCampaign" as utm_campaign,
         "utmContent" as utm_content,
         "utmTerm" as utm_term,
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
         "group",
         "createdAt" as created_at,
         "updatedAt" as updated_at`,
      params
    );

    if (!result.length) {
      return Response.json(
        { error: "Sessão não encontrada" },
        { status: 404, headers: corsHeaders }
      );
    }

    console.log(`Atualizada sessão:`, body);
    return Response.json(result[0], { headers: corsHeaders });
  } catch (error) {
    console.error("Erro ao atualizar sessão:", error);
    return Response.json(
      { error: "Falha ao atualizar sessão" },
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
