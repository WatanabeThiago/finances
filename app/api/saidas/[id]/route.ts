import { NextRequest, NextResponse } from "next/server";
import { query, sanitizeData } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await query(
      `SELECT id, valor, categoria, descricao, "formaPagamento", status, "dataVencimento", "dataPagamento", fornecedor, "isFixa", "dataSaida", "createdAt", "updatedAt"
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
    const {
      valor,
      categoria,
      descricao,
      formaPagamento,
      status,
      dataVencimento,
      dataPagamento,
      fornecedor,
      isFixa,
      dataSaida,
    } = body;

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
    const cleanStatus = status === "pendente" ? "pendente" : "pago";
    const cleanFornecedor = (fornecedor || "").trim();
    const cleanIsFixa = isFixa !== undefined ? Boolean(isFixa) : false;
    let finalDataVencimento: Date | null = null;
    if (dataVencimento) {
      if (typeof dataVencimento === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dataVencimento.trim())) {
        const [y, m, d] = dataVencimento.trim().split("-").map(Number);
        finalDataVencimento = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      } else {
        finalDataVencimento = new Date(dataVencimento);
      }
    }
    const finalDataPagamento = cleanStatus === "pago" ? (dataPagamento ? new Date(dataPagamento) : new Date()) : null;
    const finalDataSaida = dataSaida ? new Date(dataSaida) : new Date();

    const updateSql = `
      UPDATE public."Saida"
      SET valor = $1,
          categoria = $2,
          descricao = $3,
          "formaPagamento" = $4,
          status = $5,
          "dataVencimento" = $6,
          "dataPagamento" = $7,
          fornecedor = $8,
          "isFixa" = $9,
          "dataSaida" = $10,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING id, valor, categoria, descricao, "formaPagamento", status, "dataVencimento", "dataPagamento", fornecedor, "isFixa", "dataSaida", "createdAt", "updatedAt"
    `;

    const rows = await query(updateSql, [
      parsedValor,
      cleanCategoria,
      cleanDescricao,
      cleanFormaPagamento,
      cleanStatus,
      finalDataVencimento,
      finalDataPagamento,
      cleanFornecedor,
      cleanIsFixa,
      finalDataSaida,
      id,
    ]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Saída não encontrada" }, { status: 404 });
    }

    const updatedSaida = rows[0];

    // Se pertence a um crédito, atualizar a contagem de parcelas pagas e status do crédito
    try {
      const creditoCheck = await query(
        `SELECT "creditoId" FROM public."Saida" WHERE id = $1`,
        [id]
      );
      const cId = creditoCheck[0]?.creditoId;
      if (cId) {
        const stats = await query(
          `SELECT 
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status = 'pago') AS pagas
           FROM public."Saida"
           WHERE "creditoId" = $1`,
          [cId]
        );
        const total = Number(stats[0]?.total || 0);
        const pagas = Number(stats[0]?.pagas || 0);
        const newStatus = pagas >= total && total > 0 ? "quitado" : "ativo";

        await query(
          `UPDATE public."Credito"
           SET "parcelasPagas" = $1, status = $2, "updatedAt" = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [pagas, newStatus, cId]
        );
      }
    } catch (cErr) {
      console.error("Erro ao atualizar status do crédito:", cErr);
    }

    return NextResponse.json(sanitizeData(updatedSaida));
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
