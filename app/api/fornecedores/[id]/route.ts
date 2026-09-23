import { NextRequest, NextResponse } from "next/server";
import { query, sanitizeData } from "@/lib/db";

// PUT /api/fornecedores/[id] — editar fornecedor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const nome = (body.nome || "").trim();
    if (!nome) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }

    const tipo = (body.tipo || "comum").trim();
    const categoria = body.categoria ? body.categoria.trim() : null;
    const taxaMes = body.taxaMes != null ? Number(body.taxaMes) : null;
    const obs = (body.obs || "").trim();

    const rows = await query(
      `UPDATE public."Fornecedor"
       SET nome = $1, tipo = $2, categoria = $3, "taxaMes" = $4, obs = $5, "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, nome, tipo, categoria, "taxaMes", obs, "createdAt", "updatedAt"`,
      [nome, tipo, categoria, taxaMes, obs, id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 });
    }
    return NextResponse.json(sanitizeData(rows[0]));
  } catch (error: any) {
    console.error("Erro ao atualizar fornecedor:", error);
    return NextResponse.json({ error: "Erro ao atualizar fornecedor", details: error.message }, { status: 500 });
  }
}

// DELETE /api/fornecedores/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await query(`DELETE FROM public."Fornecedor" WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Erro ao excluir fornecedor:", error);
    return NextResponse.json({ error: "Erro ao excluir fornecedor", details: error.message }, { status: 500 });
  }
}
