import { NextRequest, NextResponse } from "next/server";
import { query, sanitizeData } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nome, valor, categoria, diaVencimento, ativo, observacoes } = body;

    const parsedValor = typeof valor === "string" ? parseFloat(valor.replace(",", ".")) : Number(valor);

    if (!nome || typeof nome !== "string" || !nome.trim()) {
      return NextResponse.json({ error: "Nome da conta é obrigatório." }, { status: 400 });
    }

    if (!parsedValor || isNaN(parsedValor) || parsedValor <= 0) {
      return NextResponse.json({ error: "Valor inválido. Deve ser maior que 0." }, { status: 400 });
    }

    const cleanNome = nome.trim();
    const cleanCategoria = (categoria || "Outros").trim();
    const cleanDia = Math.max(1, Math.min(31, parseInt(diaVencimento, 10) || 10));
    const cleanAtivo = ativo !== undefined ? Boolean(ativo) : true;
    const cleanObs = (observacoes || "").trim();

    const updateSql = `
      UPDATE public."ContaFixa"
      SET nome = $1,
          valor = $2,
          categoria = $3,
          "diaVencimento" = $4,
          ativo = $5,
          observacoes = $6,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING id, nome, valor, categoria, "diaVencimento", ativo, observacoes, "createdAt", "updatedAt"
    `;

    const rows = await query(updateSql, [
      cleanNome,
      parsedValor,
      cleanCategoria,
      cleanDia,
      cleanAtivo,
      cleanObs,
      id,
    ]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Conta fixa não encontrada" }, { status: 404 });
    }

    return NextResponse.json(sanitizeData(rows[0]));
  } catch (error: any) {
    console.error("Error updating conta fixa:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar conta fixa", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await query(
      `DELETE FROM public."ContaFixa" WHERE id = $1 RETURNING id`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Conta fixa não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Error deleting conta fixa:", error);
    return NextResponse.json(
      { error: "Erro ao excluir conta fixa", details: error.message },
      { status: 500 }
    );
  }
}
