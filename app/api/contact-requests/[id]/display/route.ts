import { query } from "@/lib/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function PATCH(request: Request, context: any) {
  try {
    const { id } = context.params;

    if (!id) {
      return Response.json(
        { error: "ID não fornecido" },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("Marcando contact request como exibida, ID:", id);

    // Marcar requisição como exibida
    const result = await query(
      `UPDATE contact_requests
       SET displayed = TRUE
       WHERE id = $1
       RETURNING id, phone`,
      [id]
    );

    console.log("Resultado da atualização (display):", result);

    if (result.length === 0) {
      return Response.json(
        { error: "Requisição não encontrada", id, detail: "Nenhum registro encontrado com este ID" },
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
    console.error("Erro ao marcar notificação como exibida:", error);
    return Response.json(
      { error: "Falha ao marcar notificação como exibida", detail: String(error) },
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
