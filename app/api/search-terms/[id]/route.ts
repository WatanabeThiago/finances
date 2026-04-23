import { query } from "@/lib/db";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (status !== "approved" && status !== "rejected" && status !== "pending") {
      return Response.json({ error: "status deve ser approved, rejected ou pending" }, { status: 400 });
    }

    const rows = await query(
      `UPDATE search_terms
       SET status = $1, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, term, status`,
      [status, id]
    );

    if (rows.length === 0) {
      return Response.json({ error: "Termo não encontrado" }, { status: 404 });
    }

    return Response.json(rows[0]);
  } catch (error) {
    console.error("[search-terms/[id] PATCH] erro:", error);
    return Response.json({ error: "Erro interno", detail: String(error) }, { status: 500 });
  }
}
