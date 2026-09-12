import { NextRequest, NextResponse } from "next/server";
import { query, sanitizeData } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await query(
      `SELECT id, valor, categoria, descricao, "formaPagamento", "dataSaida", "createdAt", "updatedAt"
       FROM public."Saida" WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Saída não encontrada" }, { status: 404 });
    }

    return NextResponse.json(sanitizeData(rows[0]));
  } catch (error: any) {
    console.error("Error fetching saida by id:", error);
    return NextResponse.json(
      { error: "Erro ao buscar saída", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { valor, categoria, descricao, formaPagamento, dataSaida } = body;

    const parsedValor = typeof valor === "string" ? parseFloat(valor.replace(",", ".")) : Number(valor);

    if (!parsedValor || isNaN(parsedValor) || parsedValor <= 0) {
      return NextResponse.json(
        { error: "Valor inválido. Deve ser maior que 0." },
        { status: 400 }
      );
    }

    if (!categoria || typeof categoria !== "string" || !categoria.trim()) {
      return NextResponse.json(
        { error: "Categoria é obrigatória." },
        { status: 400 }
      );
    }

    const cleanCategoria = categoria.trim();
    const cleanDescricao = (descricao || "").trim();
    const cleanFormaPagamento = (formaPagamento || "Pix").trim();
    const finalDataSaida = dataSaida ? new Date(dataSaida) : new Date();

    const updateSql = `
      UPDATE public."Saida"
      SET valor = $1,
          categoria = $2,
          descricao = $3,
          "formaPagamento" = $4,
          "dataSaida" = $5,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, valor, categoria, descricao, "formaPagamento", "dataSaida", "createdAt", "updatedAt"
    `;

    const rows = await query(updateSql, [
      parsedValor,
      cleanCategoria,
      cleanDescricao,
      cleanFormaPagamento,
      finalDataSaida,
      id,
    ]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Saída não encontrada" }, { status: 404 });
    }

    return NextResponse.json(sanitizeData(rows[0]));
  } catch (error: any) {
    console.error("Error updating saida:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar saída", details: error.message },
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
      `DELETE FROM public."Saida" WHERE id = $1 RETURNING id`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Saída não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Error deleting saida:", error);
    return NextResponse.json(
      { error: "Erro ao excluir saída", details: error.message },
      { status: 500 }
    );
  }
}
