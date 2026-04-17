import { query } from "@/lib/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function PATCH(request: Request, context: any) {
  try {
    const { id } = context.params;

    // Marcar requisição como respondida
    const result = await query(
      `UPDATE contact_requests
       SET responded_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, phone`,
      [id]
    );

    if (result.length === 0) {
      return Response.json(
        { error: "Requisição não encontrada" },
        { status: 404, headers: corsHeaders }
      );
    }

    return Response.json(
      {
        success: true,
        data: result[0],
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Erro ao atualizar requisição de contato:", error);
    return Response.json(
      { error: "Falha ao atualizar requisição de contato" },
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
