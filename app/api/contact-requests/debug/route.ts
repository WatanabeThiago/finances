import { query } from "@/lib/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  try {
    // Listar TODAS as requisições (inclusive respondidas) para debug
    const allRequests = await query(
      `SELECT 
        id,
        phone,
        to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI:SS') as created_at,
        to_char(responded_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI:SS') as responded_at,
        COALESCE(displayed, false) as displayed
       FROM contact_requests
       ORDER BY created_at DESC
       LIMIT 50`
    );

    // Informações sobre a tabela
    const tableInfo = await query(
      `SELECT 
        column_name, 
        data_type, 
        is_nullable
       FROM information_schema.columns
       WHERE table_name = 'contact_requests'
       ORDER BY ordinal_position`
    );

    return Response.json(
      {
        total_requests: allRequests.length,
        requests: allRequests,
        table_schema: tableInfo,
        note: "Endpoint de debug - lista TODAS as requisições independentemente de status",
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Erro ao buscar debug info:", error);
    return Response.json(
      { 
        error: "Falha ao Debug",
        detail: String(error),
      },
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
