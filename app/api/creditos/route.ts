import { NextRequest, NextResponse } from "next/server";
import { query, sanitizeData, initializeDatabase } from "@/lib/db";

// GET /api/creditos — lista todos os créditos com dados agregados de parcelas
export async function GET() {
  try {
    const rows = await query(
      `SELECT c.id, c."fornecedorNome", c."valorOriginal", c."taxaMes", c."numParcelas",
              c."valorParcela", c."tipoVencimento", c."diaVencimento", c."diasApos",
              c."dataContratacao", c.categoria, c.descricao, c.status, c."parcelasPagas",
              c."createdAt", c."updatedAt",
              COUNT(s.id) FILTER (WHERE s.status = 'pago') AS "qtdPagasReal",
              COUNT(s.id) AS "totalParcelasGeradas"
       FROM public."Credito" c
       LEFT JOIN public."Saida" s ON s."creditoId" = c.id
       GROUP BY c.id
       ORDER BY c."dataContratacao" DESC, c."createdAt" DESC`
    );
    return NextResponse.json(sanitizeData(rows));
  } catch (err: any) {
    if (err.message?.includes("does not exist") || err.message?.includes("column")) {
      await initializeDatabase();
      const rows = await query(
        `SELECT c.id, c."fornecedorNome", c."valorOriginal", c."taxaMes", c."numParcelas",
                c."valorParcela", c."tipoVencimento", c."diaVencimento", c."diasApos",
                c."dataContratacao", c.categoria, c.descricao, c.status, c."parcelasPagas",
                c."createdAt", c."updatedAt"
         FROM public."Credito" c
         ORDER BY c."dataContratacao" DESC, c."createdAt" DESC`
      );
      return NextResponse.json(sanitizeData(rows));
    }
    console.error("Erro ao listar créditos:", err);
    return NextResponse.json({ error: "Erro ao listar créditos" }, { status: 500 });
  }
}

// POST /api/creditos — cria crédito e gera as N saídas parceladas em contas a pagar
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fornecedorNome,
      valorOriginal,
      taxaMes,
      numParcelas,
      valorParcela,
      tipoVencimento,
      diaVencimento,
      diasApos,
      dataContratacao,
      categoria,
      descricao,
      parcelasPagasInicial,
    } = body;

    const cleanFornecedor = (fornecedorNome || "").trim();
    if (!cleanFornecedor) {
      return NextResponse.json({ error: "Fornecedor é obrigatório." }, { status: 400 });
    }

    const vOriginal = Number(valorOriginal);
    const nParcelas = Number(numParcelas);
    if (!vOriginal || vOriginal <= 0 || !nParcelas || nParcelas <= 0) {
      return NextResponse.json({ error: "Valor e número de parcelas devem ser maiores que 0." }, { status: 400 });
    }

    const tMes = taxaMes != null && taxaMes !== "" ? Number(taxaMes) : null;
    let vParcela = Number(valorParcela);

    // Se o valor da parcela não foi passado ou é zero, calcula via Price (PMT) ou divisão simples
    if (!vParcela || vParcela <= 0) {
      if (tMes && tMes > 0) {
        // PMT = PV * [i * (1 + i)^n] / [(1 + i)^n - 1]
        const i = tMes;
        const pmt = (vOriginal * (i * Math.pow(1 + i, nParcelas))) / (Math.pow(1 + i, nParcelas) - 1);
        vParcela = Math.round(pmmt(vOriginal, tMes, nParcelas) * 100) / 100;
      } else {
        vParcela = Math.round((vOriginal / nParcelas) * 100) / 100;
      }
    }

    const cleanTipoVenc = (tipoVencimento || "dia-fixo").trim();
    const cleanDiaVenc = diaVencimento != null && diaVencimento !== "" ? Number(diaVencimento) : null;
    const cleanDiasApos = diasApos != null && diasApos !== "" ? Number(diasApos) : 30;
    const dtContratacao = dataContratacao ? new Date(dataContratacao) : new Date();
    const cleanCat = (categoria || "Crédito/Empréstimo").trim();
    const cleanDesc = (descricao || "").trim();

    // 1. Inserir registro do Crédito
    let insertCreditoSql = `
      INSERT INTO public."Credito" (
        "fornecedorNome", "valorOriginal", "taxaMes", "numParcelas", "valorParcela",
        "tipoVencimento", "diaVencimento", "diasApos", "dataContratacao",
        categoria, descricao, status, "parcelasPagas"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ativo', 0)
      RETURNING id, "fornecedorNome", "valorOriginal", "taxaMes", "numParcelas",
                "valorParcela", "tipoVencimento", "diaVencimento", "diasApos",
                "dataContratacao", categoria, descricao, status, "parcelasPagas",
                "createdAt", "updatedAt"
    `;

    let creditoRow: any;
    try {
      const res = await query(insertCreditoSql, [
        cleanFornecedor,
        vOriginal,
        tMes,
        nParcelas,
        vParcela,
        cleanTipoVenc,
        cleanDiaVenc,
        cleanDiasApos,
        dtContratacao,
        cleanCat,
        cleanDesc,
      ]);
      creditoRow = res[0];
    } catch (err: any) {
      if (err.message?.includes("does not exist") || err.message?.includes("column")) {
        await initializeDatabase();
        const res = await query(insertCreditoSql, [
          cleanFornecedor,
          vOriginal,
          tMes,
          nParcelas,
          vParcela,
          cleanTipoVenc,
          cleanDiaVenc,
          cleanDiasApos,
          dtContratacao,
          cleanCat,
          cleanDesc,
        ]);
        creditoRow = res[0];
      } else {
        throw err;
      }
    }

    const pagasInic = parcelasPagasInicial != null ? Math.min(nParcelas, Math.max(0, parseInt(parcelasPagasInicial))) : 0;

    // 2. Gerar as parcelas como Saidas (status = pendente ou pago se for financiamento em andamento)
    for (let p = 1; p <= nParcelas; p++) {
      let dataVencimento: Date;

      if (cleanTipoVenc === "d+n") {
        // D + (diasApos * p)
        dataVencimento = new Date(dtContratacao.getTime());
        dataVencimento.setDate(dataVencimento.getDate() + (cleanDiasApos * p));
      } else {
        // Dia fixo nos meses subsequentes
        const targetDia = cleanDiaVenc || 10;
        dataVencimento = new Date(dtContratacao.getFullYear(), dtContratacao.getMonth() + p, targetDia, 12, 0, 0);
      }

      const descParcela = cleanDesc
        ? `Parcela ${p}/${nParcelas} (${cleanDesc})`
        : `Parcela ${p}/${nParcelas} - ${cleanFornecedor}`;

      const jaPaga = p <= pagasInic;
      const statusParcela = jaPaga ? "pago" : "pendente";
      const dataPagamento = jaPaga ? dataVencimento.toISOString() : null;

      await query(
        `INSERT INTO public."Saida" (
          valor, categoria, descricao, "formaPagamento", status,
          "dataVencimento", "dataPagamento", fornecedor, "creditoId", "numeroParcela", "dataSaida"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          vParcela,
          cleanCat,
          descParcela,
          "Pix",
          statusParcela,
          dataVencimento.toISOString(),
          dataPagamento,
          cleanFornecedor,
          creditoRow.id,
          p,
          dataVencimento.toISOString(),
        ]
      );
    }

    if (pagasInic > 0) {
      const novoStatus = pagasInic >= nParcelas ? "quitado" : "ativo";
      await query(
        `UPDATE public."Credito" SET "parcelasPagas" = $1, status = $2 WHERE id = $3`,
        [pagasInic, novoStatus, creditoRow.id]
      );
      creditoRow.parcelasPagas = pagasInic;
      creditoRow.status = novoStatus;
    }

    return NextResponse.json(sanitizeData(creditoRow), { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar crédito:", error);
    return NextResponse.json({ error: "Erro ao criar crédito", details: error.message }, { status: 500 });
  }
}

function pmmt(pv: number, i: number, n: number): number {
  if (i === 0) return pv / n;
  return (pv * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1);
}
