import { NextRequest } from "next/server";

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
        { status: 400 }
      );
    }

    // TODO: Atualizar no banco de dados
    // Aqui você vai fazer um UPDATE no banco onde id = params.id
    console.log(`Atualizando telefone do evento ${id}:`, phone);

    return Response.json({
      id,
      phone: phone.trim(),
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro ao atualizar telefone:", error);
    return Response.json(
      { error: "Falha ao atualizar telefone" },
      { status: 500 }
    );
  }
}
