import { NextRequest, NextResponse } from "next/server";
import { query, sanitizeData, initializeDatabase } from "@/lib/db";
import { syncContasFixasDoMes } from "@/lib/saida";

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
    let vendasRows: any[] = [];
    try {
      vendasRows = await query(
        `SELECT v.id, v."clienteNome", v."clienteTelefone", v."dataVenda", v."createdAt",
                v.comissao, v."comissaoPaga", v."clientePagou", v."formaPagamento",
                v."prestadorId", p.nome as "prestadorNome",
                COALESCE(json_agg(json_build_object(
                  'id', l.id, 'servicoId', l."servicoId", 'precoOriginal', l."precoOriginal",
                  'preco', l.preco, 'quantidade', l.quantidade
                )) FILTER (WHERE l.id IS NOT NULL), '[]'::json) as linhas
         FROM "VendaLg" v
         LEFT JOIN "VendaLgLine" l ON l."vendaLgId" = v.id
         LEFT JOIN "Partner" p ON p.id = v."prestadorId"
         WHERE (v."dataVenda" >= $1 AND v."dataVenda" <= $2)
            OR (v."dataVenda" IS NULL AND v."createdAt" >= $1 AND v."createdAt" <= $2)
         GROUP BY v.id, p.nome
         ORDER BY COALESCE(v."dataVenda", v."createdAt") DESC`,
        [startOfMonth, endOfMonth]
      );
    } catch (err: any) {
      if (err.message?.includes("does not exist")) {
        await initializeDatabase();
        vendasRows = [];
      } else {
        throw err;
      }
    }

    // 2. Buscar Comissões Pendentes (Dinheiro na Rua - Todas as pendentes não pagas)
    let comissoesPendentesRows: any[] = [];
    try {
      comissoesPendentesRows = await query(
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
      );
    } catch {
      comissoesPendentesRows = [];
    }

    // 3. Buscar Google Ads do Período
    let adsRows: any[] = [];
    try {
      adsRows = await query(
        `SELECT id, date, spend, cpc, impressions, url_clicks, call_clicks, msg_clicks,
                revenue, commission, clients, "createdAt"
         FROM public."DailyAdsManual"
         ORDER BY "createdAt" DESC`
      );
    } catch {
      adsRows = [];
    }

    // Filtrar ads do mês
    // Formato de date em DailyAdsManual: "DD/MM/YYYY"
    const adsDoMes = adsRows.filter((row: any) => {
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
    let saidasRows: any[] = [];
    try {
      saidasRows = await query(
        `SELECT id, valor, categoria, descricao, "formaPagamento", status,
                "dataVencimento", "dataPagamento", fornecedor, "isFixa", "dataSaida"
         FROM public."Saida"
         WHERE ("dataSaida" >= $1 AND "dataSaida" <= $2)
            OR ("dataVencimento" >= $1 AND "dataVencimento" <= $2)
         ORDER BY "dataSaida" DESC`,
        [startOfMonth, endOfMonth]
      );
    } catch {
      saidasRows = [];
    }

    // 5. Buscar Contas Fixas ativas
    let contasFixasRows: any[] = [];
    try {
      contasFixasRows = await query(
        `SELECT id, nome, valor, categoria, "diaVencimento", ativo
         FROM public."ContaFixa"
         WHERE ativo = true
         ORDER BY "diaVencimento" ASC`
      );
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

    vendasRows.forEach((v: any) => {
      const comissaoVal = typeof v.comissao === "string" ? parseFloat(v.comissao) : (v.comissao || 0);
      comissaoBrutaTotal += comissaoVal;

      if (v.comissaoPaga) {
        comissaoRecebidaMes += comissaoVal;
      } else {
        comissaoPendenteMes += comissaoVal;
      }

      let subtotalVenda = 0;
      if (Array.isArray(v.linhas)) {
        v.linhas.forEach((linha: any) => {
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
    adsDoMes.forEach((ad: any) => {
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
    const totalContasFixasMes = contasFixasRows.reduce((acc: number, c: any) => {
      const val = typeof c.valor === "string" ? parseFloat(c.valor) : (c.valor || 0);
      return acc + val;
    }, 0);

    // Saídas pagas (excluindo fixas para não duplicar se já somamos contas fixas, ou somando as do período)
    const saidasPagas = saidasRows.filter((s: any) => s.status === "pago");
    const totalSaidasPagas = saidasPagas.reduce((acc: number, s: any) => {
      const val = typeof s.valor === "string" ? parseFloat(s.valor) : (s.valor || 0);
      return acc + val;
    }, 0);

    // Saídas variáveis pagas (não fixas)
    const totalSaidasVariaveisPagas = saidasPagas
      .filter((s: any) => !s.isFixa)
      .reduce((acc: number, s: any) => {
        const val = typeof s.valor === "string" ? parseFloat(s.valor) : (s.valor || 0);
        return acc + val;
      }, 0);

    // Contas a pagar pendentes no mês
    const saidasPendentes = saidasRows.filter((s: any) => s.status === "pendente");
    const totalContasAPagarPendente = saidasPendentes.reduce((acc: number, s: any) => {
      const val = typeof s.valor === "string" ? parseFloat(s.valor) : (s.valor || 0);
      return acc + val;
    }, 0);

    // Total de despesas operacionais da empresa no mês:
    // Custo das Contas Fixas + Despesas Variáveis Efetivas
    const totalDespesasOperacionais = totalContasFixasMes + totalSaidasVariaveisPagas;

    // Resultado Operacional Líquido Real (O que sobra no bolso do dono)
    const lucroLiquidoReal = margemContribuicao - totalDespesasOperacionais;
    const margemLiquidaRealPercentual = comissaoBrutaTotal > 0 ? (lucroLiquidoReal / comissaoBrutaTotal) * 100 : 0;

    // Ponto de Equilíbrio (Break-Even)
    // Para cobrir: Custos Fixos + Saídas Variáveis + Google Ads + Imposto
    // Margem líquida unitária de imposto por venda: comissaoMediaPorVenda * (1 - aliquotaImposto / 100)
    const comissaoLiquidaMediaUnit = comissaoMediaPorVenda * (1 - (aliquotaImposto / 100));
    const margemUnitAposAds = comissaoLiquidaMediaUnit - cacMedio;

    // Ponto de equilíbrio em R$ de Comissão Bruta necessária:
    // (Custos Fixos + Despesas + Gasto Ads) / (1 - aliquotaImposto / 100)
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
    // 1. Reserva para Google Ads: (Média diária de Ads) * diasSegurancaGiro
    const reservaGiroAds = mediaDiariaAds * diasSegurancaGiro;

    // 2. Reserva de Custos Fixos: Contas Fixas * (diasSegurancaGiro / 30)
    const reservaGiroCustosFixos = totalContasFixasMes * (diasSegurancaGiro / 30);

    // 3. Provisão de Impostos (DAS do Simples do próximo dia 20)
    const reservaGiroImpostos = provisaoSimplesNacional;

    // 4. Dinheiro na Rua (Comissões Pendentes Totais)
    const totalDinheiroNaRua = comissoesPendentesRows.reduce((acc: number, row: any) => {
      const val = typeof row.comissao === "string" ? parseFloat(row.comissao) : (row.comissao || 0);
      return acc + val;
    }, 0);

    // Total de Capital de Giro Recomendado
    const capitalDeGiroRecomendado = reservaGiroAds + reservaGiroCustosFixos + reservaGiroImpostos + totalDinheiroNaRua;

    // Resumo diário de custos de sobrevivência
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
          itens: comissoesPendentesRows.map((r: any) => ({
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
  } catch (error: any) {
    console.error("GET /api/financeiro error:", error);
    return NextResponse.json(
      { error: "Falha ao calcular métricas financeiras", details: error.message },
      { status: 500 }
    );
  }
}
