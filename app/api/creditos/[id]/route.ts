import { NextRequest, NextResponse } from "next/server";
import { query, sanitizeData } from "@/lib/db";

// GET /api/creditos/[id] — busca um crédito e suas parcelas geradas
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const creditos = await query(
      `SELECT * FROM public."Credito" WHERE id = $1`,
      [id]
    );

    if (creditos.length === 0) {
      return NextResponse.json({ error: "Crédito não encontrado." }, { status: 404 });
    }

    const credito = creditos[0];

    const parcelas = await query(
      `SELECT id, valor, categoria, descricao, status, "dataVencimento", "dataPagamento",
              "numeroParcela", "dataSaida", "formaPagamento"
       FROM public."Saida"
       WHERE "creditoId" = $1
       ORDER BY "numeroParcela" ASC, "dataVencimento" ASC`,
      [id]
    );

    // Cálculos de amortização e simulação de juros
    const n = Number(credito.numParcelas);
    const i = Number(credito.taxaMes || 0);
    const pv = Number(credito.valorOriginal);
    const pmt = Number(credito.valorParcela);

    // Tabela SAC/Price simulação da amortização
    let saldoDevedor = pv;
    const parcelasComSimulacao = parcelas.map((parc: any) => {
      const jurosParcela = saldoDevedor * i;
      const amortizacao = Math.max(0, pmt - jurosParcela);
      const saldoApos = Math.max(0, saldoDevedor - amortizacao);
      const res = {
        ...parc,
        jurosEmbutidos: Math.round(jurosParcela * 100) / 100,
        amortizacaoCapital: Math.round(amortizacao * 100) / 100,
        saldoDevedorAtual: Math.round(saldoDevedor * 100) / 100,
        valorParaQuitarAntecipado: Math.round(saldoDevedor * 100) / 100,
      };
      if (parc.status === "pago") {
        saldoDevedor = saldoApos;
      }
      return res;
    });

    const saldoDevedorRestante = parcelas
      .filter((p: any) => p.status !== "pago")
      .reduce((acc: number, curr: any) => {
        const item = parcelasComSimulacao.find((s: any) => s.id === curr.id);
        return acc + (item ? item.amortizacaoCapital : Number(curr.valor));
      }, 0);

    return NextResponse.json(
      sanitizeData({
        ...credito,
        parcelas: parcelasComSimulacao,
        saldoDevedorRestante: Math.round(saldoDevedorRestante * 100) / 100,
      })
    );
  } catch (error: any) {
    console.error("Erro ao buscar crédito:", error);
    return NextResponse.json({ error: "Erro ao buscar crédito", details: error.message }, { status: 500 });
  }
}

// DELETE /api/creditos/[id] — cancela/exclui o crédito e remove as parcelas pendentes
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Remove parcelas que ainda estão pendentes
    await query(
      `DELETE FROM public."Saida" WHERE "creditoId" = $1 AND status = 'pendente'`,
      [id]
    );

    // Deleta o registro do crédito
    await query(`DELETE FROM public."Credito" WHERE id = $1`, [id]);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Erro ao excluir crédito:", error);
    return NextResponse.json({ error: "Erro ao excluir crédito", details: error.message }, { status: 500 });
  }
}
