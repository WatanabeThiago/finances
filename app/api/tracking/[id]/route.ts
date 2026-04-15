import { NextRequest } from "next/server";

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

    // TODO: Atualizar no banco de dados
    // Aqui você vai fazer um UPDATE no banco onde id = params.id
    console.log(`Atualizando telefone do evento ${id}:`, phone);

    return Response.json({
      id,
      phone: phone.trim(),
      updated_at: new Date().toISOString(),
    }, { headers: corsHeaders });
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
