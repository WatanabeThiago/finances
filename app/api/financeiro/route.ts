import { NextRequest, NextResponse } from "next/server";
import { query, sanitizeData, initializeDatabase } from "@/lib/db";
import { syncContasFixasDoMes } from "@/lib/saida";

type VendaLinha = {
  id: string;
  tipo?: string;
  servicoId?: string | null;
  produtoId?: string | null;
  nome?: string;
  precoOriginal: number | string;
  preco: number | string;
  quantidade: number | string;
};

type VendaQueryRow = {
  id: string;
  clienteNome: string;
  clienteTelefone: string | null;
  dataVenda: string | Date | null;
  createdAt: string | Date;
  comissao: number | string | null;
  comissaoPaga: boolean | null;
  clientePagou: boolean | null;
  formaPagamento: string | null;
  prestadorId: string | null;
  prestadorNome: string | null;
  linhas: VendaLinha[];
};

type PendenteQueryRow = {
  id: string;
  clienteNome: string;
  clienteTelefone: string | null;
  dataVenda: string | Date | null;
  createdAt: string | Date;
  comissao: number | string | null;
  comissaoPaga: boolean | null;
  clientePagou: boolean | null;
  formaPagamento: string | null;
  prestadorId: string | null;
  prestadorNome: string | null;
  valorTotalVenda: number | string | null;
};

type AdsQueryRow = {
  id: string;
  date: string;
  spend: number | string;
  cpc: number | string;
  impressions: number | string;
  url_clicks?: number | string | null;
  call_clicks?: number | string | null;
  msg_clicks?: number | string | null;
  revenue?: number | string | null;
  commission?: number | string | null;
  clients?: number | string | null;
  createdAt: string | Date;
};

type SaidaQueryRow = {
  id: string;
  valor: number | string;
  categoria: string;
  descricao: string | null;
  formaPagamento: string | null;
  status: string;
  dataVencimento: string | Date | null;
  dataPagamento: string | Date | null;
  fornecedor: string | null;
  isFixa: boolean | null;
  dataSaida: string | Date | null;
};

type ContaFixaQueryRow = {
  id: string;
  nome: string;
  valor: number | string;
  categoria: string;
  diaVencimento: number;
  ativo: boolean;
};

export async function GET(request: NextRequest) {
  try {
    // Sincroniza contas fixas ativas para o mês corrente
    try {
      await syncContasFixasDoMes(query);
    } catch (e) {
      console.warn("Could not sync contas fixas:", e);
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    
    const mesParam = searchParams.get("mes");
    const anoParam = searchParams.get("ano");
    const aliquotaParam = searchParams.get("aliquota");
    const diasGiroParam = searchParams.get("diasGiro");

    const mes = mesParam ? parseInt(mesParam, 10) : now.getMonth() + 1;
    const ano = anoParam ? parseInt(anoParam, 10) : now.getFullYear();
    const aliquotaImposto = aliquotaParam ? parseFloat(aliquotaParam) : 6.0; // Padrão Simples Nacional 6%
    const diasSegurancaGiro = diasGiroParam ? parseInt(diasGiroParam, 10) : 30; // Padrão 30 dias de segurança

    // Intervalo do mês em UTC
    const startOfMonth = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
    const daysInMonth = new Date(ano, mes, 0).getDate();

    // Quantos dias já se passaram no mês para fins de cálculo de média diária
    const isCurrentMonth = now.getFullYear() === ano && (now.getMonth() + 1) === mes;
    const diasDecorridos = isCurrentMonth ? Math.max(1, now.getDate()) : daysInMonth;

    // 1. Buscar Vendas do Período (com linhas e prestador)
    let vendasRows: VendaQueryRow[] = [];
    try {
      vendasRows = (await query(
        `SELECT v.id, v."clienteNome", v."clienteTelefone", v."dataVenda", v."createdAt",
                v.comissao, v."comissaoPaga", v."clientePagou", v."formaPagamento",
                v."prestadorId", p.nome as "prestadorNome",
                COALESCE(json_agg(json_build_object(
                  'id', l.id, 
                  'tipo', COALESCE(l.tipo, CASE WHEN l."produtoId" IS NOT NULL THEN 'produto' ELSE 'servico' END),
                  'servicoId', l."servicoId", 
                  'produtoId', l."produtoId",
                  'nome', COALESCE(l.nome, 'Item'),
                  'precoOriginal', l."precoOriginal",
                  'preco', l.preco, 
                  'quantidade', l.quantidade
                )) FILTER (WHERE l.id IS NOT NULL), '[]'::json) as linhas
         FROM "VendaLg" v
         LEFT JOIN "VendaLgLine" l ON l."vendaLgId" = v.id
         LEFT JOIN "Partner" p ON p.id = v."prestadorId"
         WHERE (v."dataVenda" >= $1 AND v."dataVenda" <= $2)
            OR (v."dataVenda" IS NULL AND v."createdAt" >= $1 AND v."createdAt" <= $2)
         GROUP BY v.id, p.nome
         ORDER BY COALESCE(v."dataVenda", v."createdAt") DESC`,
        [startOfMonth, endOfMonth]
      )) as VendaQueryRow[];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("does not exist")) {
        await initializeDatabase();
        vendasRows = [];
      } else {
        throw err;
      }
    }

    // 2. Buscar Comissões Pendentes (Dinheiro na Rua - Todas as pendentes não pagas)
    let comissoesPendentesRows: PendenteQueryRow[] = [];
    try {
      comissoesPendentesRows = (await query(
        `SELECT v.id, v."clienteNome", v."clienteTelefone", v."dataVenda", v."createdAt",
                v.comissao, v."comissaoPaga", v."clientePagou", v."formaPagamento",
                v."prestadorId", p.nome as "prestadorNome",
                COALESCE(SUM(l.preco * l.quantidade), 0) as "valorTotalVenda"
         FROM "VendaLg" v
         LEFT JOIN "VendaLgLine" l ON l."vendaLgId" = v.id
         LEFT JOIN "Partner" p ON p.id = v."prestadorId"
         WHERE (v."comissaoPaga" = false OR v."comissaoPaga" IS NULL)
           AND COALESCE(v.comissao, 0) > 0
         GROUP BY v.id, p.nome
         ORDER BY COALESCE(v."dataVenda", v."createdAt") DESC`,
        []
      )) as PendenteQueryRow[];
    } catch {
      comissoesPendentesRows = [];
    }

    // 3. Buscar Google Ads do Período
    let adsRows: AdsQueryRow[] = [];
    try {
      adsRows = (await query(
        `SELECT id, date, spend, cpc, impressions, url_clicks, call_clicks, msg_clicks,
                revenue, commission, clients, "createdAt"
         FROM public."DailyAdsManual"
         ORDER BY "createdAt" DESC`
      )) as AdsQueryRow[];
    } catch {
      adsRows = [];
    }

    // Filtrar ads do mês (formato "DD/MM/YYYY")
    const adsDoMes = adsRows.filter((row: AdsQueryRow) => {
      if (!row.date) return false;
      const parts = row.date.split("/");
      if (parts.length === 3) {
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        return m === mes && y === ano;
      }
      return false;
    });

    // 4. Buscar Saídas do Período
    let saidasRows: SaidaQueryRow[] = [];
    try {
      saidasRows = (await query(
        `SELECT id, valor, categoria, descricao, "formaPagamento", status,
                "dataVencimento", "dataPagamento", fornecedor, "isFixa", "dataSaida"
         FROM public."Saida"
         WHERE ("dataSaida" >= $1 AND "dataSaida" <= $2)
            OR ("dataVencimento" >= $1 AND "dataVencimento" <= $2)
         ORDER BY "dataSaida" DESC`,
        [startOfMonth, endOfMonth]
      )) as SaidaQueryRow[];
    } catch {
      saidasRows = [];
    }

    // 5. Buscar Contas Fixas ativas
    let contasFixasRows: ContaFixaQueryRow[] = [];
    try {
      contasFixasRows = (await query(
        `SELECT id, nome, valor, categoria, "diaVencimento", ativo
         FROM public."ContaFixa"
         WHERE ativo = true
         ORDER BY "diaVencimento" ASC`
      )) as ContaFixaQueryRow[];
    } catch {
      contasFixasRows = [];
    }

    // ==========================================
    // CÁLCULOS FINANCEIROS E INTELIGÊNCIA
    // ==========================================

    // Vendas e Faturamento Transacionado
    let faturamentoBrutoTotal = 0;
    let comissaoBrutaTotal = 0;
    let comissaoRecebidaMes = 0;
    let comissaoPendenteMes = 0;
    const totalVendasCount = vendasRows.length;

    vendasRows.forEach((v: VendaQueryRow) => {
      const comissaoVal = typeof v.comissao === "string" ? parseFloat(v.comissao) : (v.comissao || 0);
      comissaoBrutaTotal += comissaoVal;

      if (v.comissaoPaga) {
        comissaoRecebidaMes += comissaoVal;
      } else {
        comissaoPendenteMes += comissaoVal;
      }

      let subtotalVenda = 0;
      if (Array.isArray(v.linhas)) {
        v.linhas.forEach((linha: VendaLinha) => {
          const preco = typeof linha.preco === "string" ? parseFloat(linha.preco) : (linha.preco || 0);
          const qtd = typeof linha.quantidade === "string" ? parseInt(linha.quantidade, 10) : (linha.quantidade || 1);
          subtotalVenda += preco * qtd;
        });
      }
      faturamentoBrutoTotal += subtotalVenda;
    });

    const repasseParceiros = Math.max(0, faturamentoBrutoTotal - comissaoBrutaTotal);
    const ticketMedioTransacionado = totalVendasCount > 0 ? faturamentoBrutoTotal / totalVendasCount : 0;
    const comissaoMediaPorVenda = totalVendasCount > 0 ? comissaoBrutaTotal / totalVendasCount : 0;

    // Tributos: Simples Nacional (Provisão sobre a comissão bruta)
    const provisaoSimplesNacional = comissaoBrutaTotal * (aliquotaImposto / 100);
    const comissaoLiquidaImposto = Math.max(0, comissaoBrutaTotal - provisaoSimplesNacional);

    // Google Ads
    let totalGastoAds = 0;
    let totalCliquesAds = 0;
    let totalImpressoesAds = 0;
    adsDoMes.forEach((ad: AdsQueryRow) => {
      totalGastoAds += typeof ad.spend === "string" ? parseFloat(ad.spend) : (ad.spend || 0);
      const urlCl = typeof ad.url_clicks === "number" ? ad.url_clicks : 0;
      const callCl = typeof ad.call_clicks === "number" ? ad.call_clicks : 0;
      const msgCl = typeof ad.msg_clicks === "number" ? ad.msg_clicks : 0;
      totalCliquesAds += (urlCl + callCl + msgCl);
      totalImpressoesAds += typeof ad.impressions === "string" ? parseInt(ad.impressions, 10) : (ad.impressions || 0);
    });

    const mediaDiariaAds = diasDecorridos > 0 ? totalGastoAds / diasDecorridos : 0;
    const roasReal = totalGastoAds > 0 ? (comissaoBrutaTotal / totalGastoAds) : 0;
    const cacMedio = totalVendasCount > 0 ? (totalGastoAds / totalVendasCount) : 0;

    // Margem de Contribuição Líquida (Comissão Líquida de Imposto - Google Ads)
    const margemContribuicao = comissaoLiquidaImposto - totalGastoAds;
    const margemContribuicaoPercentual = comissaoBrutaTotal > 0 ? (margemContribuicao / comissaoBrutaTotal) * 100 : 0;

    // Custos Fixos & Saídas Operacionais
    const totalContasFixasMes = contasFixasRows.reduce((acc: number, c: ContaFixaQueryRow) => {
      const val = typeof c.valor === "string" ? parseFloat(c.valor) : (c.valor || 0);
      return acc + val;
    }, 0);

    // Saídas pagas
    const saidasPagas = saidasRows.filter((s: SaidaQueryRow) => s.status === "pago");
    const totalSaidasPagas = saidasPagas.reduce((acc: number, s: SaidaQueryRow) => {
      const val = typeof s.valor === "string" ? parseFloat(s.valor) : (s.valor || 0);
      return acc + val;
    }, 0);

    // Saídas variáveis pagas (não fixas)
    const totalSaidasVariaveisPagas = saidasPagas
      .filter((s: SaidaQueryRow) => !s.isFixa)
      .reduce((acc: number, s: SaidaQueryRow) => {
        const val = typeof s.valor === "string" ? parseFloat(s.valor) : (s.valor || 0);
        return acc + val;
      }, 0);

    // Contas a pagar pendentes no mês
    const saidasPendentes = saidasRows.filter((s: SaidaQueryRow) => s.status === "pendente");
    const totalContasAPagarPendente = saidasPendentes.reduce((acc: number, s: SaidaQueryRow) => {
      const val = typeof s.valor === "string" ? parseFloat(s.valor) : (s.valor || 0);
      return acc + val;
    }, 0);

    // Total de despesas operacionais da empresa no mês:
    const totalDespesasOperacionais = totalContasFixasMes + totalSaidasVariaveisPagas;

    // Resultado Operacional Líquido Real (O que sobra no bolso do dono)
    const lucroLiquidoReal = margemContribuicao - totalDespesasOperacionais;
    const margemLiquidaRealPercentual = comissaoBrutaTotal > 0 ? (lucroLiquidoReal / comissaoBrutaTotal) * 100 : 0;

    // Ponto de Equilíbrio (Break-Even)
    const divisorImposto = Math.max(0.01, 1 - (aliquotaImposto / 100));
    const comissaoNecessariaPontoEquilibrio = (totalDespesasOperacionais + totalGastoAds) / divisorImposto;

    let vendasNecessariasPontoEquilibrio = 0;
    if (comissaoMediaPorVenda > 0) {
      vendasNecessariasPontoEquilibrio = Math.ceil(comissaoNecessariaPontoEquilibrio / comissaoMediaPorVenda);
    }

    const progressoPontoEquilibrio = comissaoNecessariaPontoEquilibrio > 0
      ? Math.min(100, Math.round((comissaoBrutaTotal / comissaoNecessariaPontoEquilibrio) * 100))
      : 100;
    const faltaParaPontoEquilibrio = Math.max(0, comissaoNecessariaPontoEquilibrio - comissaoBrutaTotal);

    // ==========================================
    // NECESSIDADE DE CAPITAL DE GIRO (NCG)
    // ==========================================
    const reservaGiroAds = mediaDiariaAds * diasSegurancaGiro;
    const reservaGiroCustosFixos = totalContasFixasMes * (diasSegurancaGiro / 30);
    const reservaGiroImpostos = provisaoSimplesNacional;

    const totalDinheiroNaRua = comissoesPendentesRows.reduce((acc: number, row: PendenteQueryRow) => {
      const val = typeof row.comissao === "string" ? parseFloat(row.comissao) : (row.comissao || 0);
      return acc + val;
    }, 0);

    const capitalDeGiroRecomendado = reservaGiroAds + reservaGiroCustosFixos + reservaGiroImpostos + totalDinheiroNaRua;
    const custoDiarioSobrevivencia = (totalDespesasOperacionais / daysInMonth) + mediaDiariaAds;

    return NextResponse.json(
      sanitizeData({
        periodo: {
          mes,
          ano,
          daysInMonth,
          diasDecorridos,
          isCurrentMonth,
        },
        parametros: {
          aliquotaImposto,
          diasSegurancaGiro,
        },
        resumoVendas: {
          totalVendasCount,
          faturamentoBrutoTotal,
          repasseParceiros,
          ticketMedioTransacionado,
          comissaoBrutaTotal,
          comissaoRecebidaMes,
          comissaoPendenteMes,
          comissaoMediaPorVenda,
        },
        tributos: {
          aliquotaImposto,
          provisaoSimplesNacional,
          comissaoLiquidaImposto,
          diaVencimentoDAS: 20,
        },
        googleAds: {
          totalGastoAds,
          mediaDiariaAds,
          totalCliquesAds,
          totalImpressoesAds,
          roasReal,
          cacMedio,
          diasComRegistro: adsDoMes.length,
        },
        margemContribuicao: {
          valor: margemContribuicao,
          percentual: margemContribuicaoPercentual,
          status: margemContribuicao > 0 ? "positiva" : "negativa",
        },
        custosOperacionais: {
          totalContasFixasMes,
          totalSaidasVariaveisPagas,
          totalSaidasPagas,
          totalContasAPagarPendente,
          totalDespesasOperacionais,
          contasFixas: contasFixasRows,
        },
        resultadoReal: {
          lucroLiquidoReal,
          margemLiquidaRealPercentual,
          status: lucroLiquidoReal > 0 ? "lucro" : lucroLiquidoReal < 0 ? "prejuizo" : "zero",
        },
        pontoEquilibrio: {
          comissaoNecessaria: comissaoNecessariaPontoEquilibrio,
          vendasNecessarias: vendasNecessariasPontoEquilibrio,
          vendasRealizadas: totalVendasCount,
          comissaoRealizada: comissaoBrutaTotal,
          faltaParaAtingir: faltaParaPontoEquilibrio,
          progressoPercentual: progressoPontoEquilibrio,
          atingido: comissaoBrutaTotal >= comissaoNecessariaPontoEquilibrio,
        },
        capitalDeGiro: {
          diasSeguranca: diasSegurancaGiro,
          custoDiarioSobrevivencia,
          reservaAds: reservaGiroAds,
          reservaCustosFixos: reservaGiroCustosFixos,
          reservaImpostos: reservaGiroImpostos,
          dinheiroNaRua: totalDinheiroNaRua,
          capitalDeGiroRecomendado,
        },
        dinheiroNaRua: {
          total: totalDinheiroNaRua,
          quantidadePendencias: comissoesPendentesRows.length,
          itens: comissoesPendentesRows.map((r: PendenteQueryRow) => ({
            id: r.id,
            clienteNome: r.clienteNome,
            clienteTelefone: r.clienteTelefone,
            dataVenda: r.dataVenda || r.createdAt,
            prestadorNome: r.prestadorNome || "Sem parceiro",
            comissao: typeof r.comissao === "string" ? parseFloat(r.comissao) : (r.comissao || 0),
            valorTotalVenda: typeof r.valorTotalVenda === "string" ? parseFloat(r.valorTotalVenda) : (r.valorTotalVenda || 0),
            formaPagamento: r.formaPagamento,
          })),
        },
      })
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/financeiro error:", err);
    return NextResponse.json(
      { error: "Falha ao calcular métricas financeiras", details: err?.message || String(error) },
      { status: 500 }
    );
  }
}
