"use client";

import { formatBRL } from "@/lib/money";
import type { VendaLg } from "@/lib/venda-lg";
import type { DailyAds } from "@/lib/daily-ads";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

type DashboardData = {
  vendas: VendaLg[];
  dailyAds: DailyAds[];
};

const QuickStats = ({ label, value, change, color = "sky" }: { label: string; value: string; change?: string; color?: string }) => {
  const colorClasses = {
    sky: "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800",
    green: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
    red: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    amber: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    violet: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
        {value}
      </p>
      {change && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {change}
        </p>
      )}
    </div>
  );
};

const SimpleChart = ({ data, maxValue }: { data: number[]; maxValue: number }) => {
  const height = 100;
  const width = 300;
  const barWidth = width / data.length;

  return (
    <svg width={width} height={height} className="mx-auto">
      {data.map((value, i) => {
        const barHeight = (value / maxValue) * height;
        const x = i * barWidth;
        const y = height - barHeight;

        return (
          <g key={i}>
            <rect
              x={x + 2}
              y={y}
              width={barWidth - 4}
              height={barHeight}
              fill="currentColor"
              className="text-sky-500 dark:text-sky-400"
              opacity="0.7"
            />
          </g>
        );
      })}
    </svg>
  );
};

export function DashboardScreen() {
  const [data, setData] = useState<DashboardData>({
    vendas: [],
    dailyAds: [],
  });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<"yesterday" | "today" | "7d" | "30d">("7d");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [vendasRes, adsRes] = await Promise.all([
          fetch("/api/vendas-lg"),
          fetch("/api/daily-ads"),
        ]);

        const vendas = vendasRes.ok ? await vendasRes.json() : [];
        const dailyAds = adsRes.ok ? await adsRes.json() : [];

        // Normalize numeric values
        const normalizedVendas = vendas.map((v: any) => ({
          ...v,
          comissao: typeof v.comissao === "string" ? parseFloat(v.comissao) : v.comissao,
          linhas: Array.isArray(v.linhas) ? v.linhas.map((l: any) => ({
            ...l,
            precoOriginal: typeof l.precoOriginal === "string" ? parseFloat(l.precoOriginal) : l.precoOriginal,
            preco: typeof l.preco === "string" ? parseFloat(l.preco) : l.preco,
            quantidade: typeof l.quantidade === "string" ? parseInt(l.quantidade, 10) : l.quantidade,
          })) : [],
        }));

        const normalizedAds = dailyAds.map((d: any) => ({
          ...d,
          entradaReal: typeof d.entradaReal === "string" ? parseFloat(d.entradaReal) : d.entradaReal,
          gastosGoogleAds: typeof d.gastosGoogleAds === "string" ? parseFloat(d.gastosGoogleAds) : d.gastosGoogleAds,
          clientes: typeof d.clientes === "string" ? parseInt(d.clientes, 10) : d.clientes,
          cac: typeof d.cac === "string" ? parseFloat(d.cac) : d.cac,
          ticketMedio: typeof d.ticketMedio === "string" ? parseFloat(d.ticketMedio) : d.ticketMedio,
          cpc: typeof d.cpc === "string" ? parseFloat(d.cpc) : d.cpc,
          resultado: typeof d.resultado === "string" ? parseFloat(d.resultado) : d.resultado,
        }));

        setData({
          vendas: normalizedVendas,
          dailyAds: normalizedAds,
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter data based on selected date range
  const filteredData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let cutoffDate: Date;
    if (dateFilter === "today") {
      cutoffDate = startOfToday;
    } else if (dateFilter === "yesterday") {
      cutoffDate = new Date(startOfToday);
      cutoffDate.setDate(cutoffDate.getDate() - 1);
      const endOfYesterday = new Date(cutoffDate);
      endOfYesterday.setDate(endOfYesterday.getDate() + 1);
      const filteredVendas = data.vendas.filter((v) => {
        const vendaDate = new Date(v.dataVenda);
        return vendaDate >= cutoffDate && vendaDate < endOfYesterday;
      });
      const filteredAds = data.dailyAds.filter((d) => {
        const adsDate = new Date(d.data);
        return adsDate >= cutoffDate && adsDate < endOfYesterday;
      });
      return { vendas: filteredVendas, dailyAds: filteredAds };
    } else if (dateFilter === "7d") {
      cutoffDate = new Date(startOfToday);
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else {
      // 30d
      cutoffDate = new Date(startOfToday);
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    }

    const filteredVendas = data.vendas.filter((v) => {
      const vendaDate = new Date(v.dataVenda);
      return vendaDate >= cutoffDate;
    });

    const filteredAds = data.dailyAds.filter((d) => {
      const adsDate = new Date(d.data);
      return adsDate >= cutoffDate;
    });

    return { vendas: filteredVendas, dailyAds: filteredAds };
  }, [data, dateFilter]);

  const stats = useMemo(() => {
    const totalVendas = filteredData.vendas.reduce((acc, v) => {
      const subtotal = v.linhas.reduce((s, l) => s + l.preco * l.quantidade, 0);
      return acc + subtotal;
    }, 0);

    const totalComissao = filteredData.vendas.reduce((acc, v) => acc + (v.comissao || 0), 0);
    const totalGastosAds = filteredData.dailyAds.reduce((acc, d) => acc + d.gastosGoogleAds, 0);
    const totalClientesAds = filteredData.dailyAds.reduce((acc, d) => acc + d.clientes, 0);
    const avgCAC = filteredData.dailyAds.length > 0 
      ? filteredData.dailyAds.reduce((acc, d) => acc + d.cac, 0) / filteredData.dailyAds.length
      : 0;

    const resultadoComissao = totalComissao - totalGastosAds;
    const roi = totalGastosAds > 0 ? ((totalVendas - totalGastosAds) / totalGastosAds) * 100 : 0;
    
    // Additional metrics
    const vendaComComissao = filteredData.vendas.filter((v) => v.comissao && v.comissao > 0);
    const comissaoMedia = vendaComComissao.length > 0 
      ? vendaComComissao.reduce((acc, v) => acc + (v.comissao || 0), 0) / vendaComComissao.length
      : 0;
    
    const comissaoPaga = filteredData.vendas
      .filter((v) => v.comissaoPaga && v.comissao)
      .reduce((acc, v) => acc + (v.comissao || 0), 0);
    
    const comissaoNaoPaga = totalComissao - comissaoPaga;
    
    const ticketMedio = filteredData.vendas.length > 0 ? totalVendas / filteredData.vendas.length : 0;
    
    const faturamentoParceiro = vendaComComissao.reduce((acc, v) => {
      const subtotal = v.linhas.reduce((s, l) => s + l.preco * l.quantidade, 0);
      return acc + (subtotal - (v.comissao || 0));
    }, 0);

    return {
      totalVendas,
      totalVendidas: filteredData.vendas.length,
      totalComissao,
      totalGastosAds,
      totalClientesAds,
      avgCAC,
      roi,
      resultadoComissao,
      comissaoMedia,
      comissaoPaga,
      comissaoNaoPaga,
      ticketMedio,
      faturamentoParceiro,
      vendaComComissaoCount: vendaComComissao.length,
    };
  }, [filteredData]);

  const recentEvents = useMemo(() => {
    const events: Array<{ type: "venda" | "ads"; date: string; description: string; value: number }> = [];

    filteredData.vendas.slice(0, 5).forEach((v) => {
      events.push({
        type: "venda",
        date: new Date(v.dataVenda).toISOString(),
        description: `Venda para ${v.clienteNome}`,
        value: v.comissao || 0,
      });
    });

    filteredData.dailyAds.slice(0, 5).forEach((d) => {
      events.push({
        type: "ads",
        date: new Date(d.data).toISOString(),
        description: `Gasto Google Ads - ${d.clientes} clientes`,
        value: d.gastosGoogleAds,
      });
    });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-500">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-zinc-50 p-4 dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Visão geral do seu negócio
          </p>
        </div>

        {/* Date Filter */}
        <div className="mb-8 flex gap-2">
          <button
            onClick={() => setDateFilter("yesterday")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dateFilter === "yesterday"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            }`}
          >
            Ontem
          </button>
          <button
            onClick={() => setDateFilter("today")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dateFilter === "today"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setDateFilter("7d")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dateFilter === "7d"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            }`}
          >
            Últimos 7 dias
          </button>
          <button
            onClick={() => setDateFilter("30d")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dateFilter === "30d"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            }`}
          >
            Últimos 30 dias
          </button>
        </div>

        {/* KPI Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <QuickStats
            label="Total de Vendas"
            value={formatBRL(stats.totalVendas)}
            change={`${stats.totalVendidas} venda${stats.totalVendidas !== 1 ? "s" : ""}`}
            color="green"
          />
          <QuickStats
            label="Ticket Médio"
            value={formatBRL(stats.ticketMedio)}
            change={`${stats.totalVendidas} vendas`}
            color="sky"
          />
          <QuickStats
            label="Comissão Total"
            value={formatBRL(stats.totalComissao)}
            change={`${stats.vendaComComissaoCount} com comissão`}
            color="violet"
          />
          <QuickStats
            label="Comissão Média"
            value={formatBRL(stats.comissaoMedia)}
            change={`${stats.vendaComComissaoCount} venda${stats.vendaComComissaoCount !== 1 ? "s" : ""}`}
            color="violet"
          />
          <QuickStats
            label="Comissões Pagas"
            value={formatBRL(stats.comissaoPaga)}
            change="Pendentes de pagamento"
            color="emerald"
          />
          <QuickStats
            label="Comissões Não Pagas"
            value={formatBRL(stats.comissaoNaoPaga)}
            change="Aguardando pagamento"
            color="amber"
          />
          <QuickStats
            label="Faturamento do Parceiro"
            value={formatBRL(stats.faturamentoParceiro)}
            change="Receita parceira"
            color="blue"
          />
          <QuickStats
            label="Gasto Google Ads"
            value={formatBRL(stats.totalGastosAds)}
            change={`${stats.totalClientesAds} clientes`}
            color="red"
          />
          <QuickStats
            label="CAC Médio"
            value={formatBRL(stats.avgCAC)}
            change="Custo por cliente"
            color="amber"
          />
          <QuickStats
            label="Resultado Comissão"
            value={formatBRL(stats.resultadoComissao)}
            change={stats.resultadoComissao >= 0 ? "Positivo" : "Negativo"}
            color={stats.resultadoComissao >= 0 ? "green" : "red"}
          />
          <QuickStats
            label="ROI Ads"
            value={`${stats.roi.toFixed(1)}%`}
            change="Retorno do investimento"
            color={stats.roi > 100 ? "green" : stats.roi > 0 ? "sky" : "red"}
          />
          <QuickStats
            label="Saúde Geral"
            value={stats.roi > 100 ? "🚀 Ótima" : stats.roi > 0 ? "✅ Boa" : "⚠️ Atenção"}
            change="Status do negócio"
            color="sky"
          />
        </div>

        {/* Charts Row */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* Vendas Chart */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
              Últimas Vendas
            </h3>
            <div className="text-zinc-500 dark:text-zinc-400">
              {data.vendas.slice(0, 7).length > 0 ? (
                <SimpleChart
                  data={data.vendas.slice(0, 7).map((v) =>
                    v.linhas.reduce((s, l) => s + l.preco * l.quantidade, 0)
                  )}
                  maxValue={Math.max(
                    ...data.vendas.slice(0, 7).map((v) =>
                      v.linhas.reduce((s, l) => s + l.preco * l.quantidade, 0)
                    ),
                    1
                  )}
                />
              ) : (
                <p className="text-center text-sm">Nenhuma venda registrada</p>
              )}
            </div>
          </div>

          {/* Ads Chart */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
              Gastos Google Ads (últimos 7 dias)
            </h3>
            <div className="text-zinc-500 dark:text-zinc-400">
              {data.dailyAds.slice(0, 7).length > 0 ? (
                <SimpleChart
                  data={data.dailyAds.slice(0, 7).map((d) => d.gastosGoogleAds)}
                  maxValue={Math.max(
                    ...data.dailyAds.slice(0, 7).map((d) => d.gastosGoogleAds),
                    1
                  )}
                />
              ) : (
                <p className="text-center text-sm">Nenhum dado de ads registrado</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Events */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              Atividade Recente
            </h3>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {recentEvents.length > 0 ? (
              recentEvents.map((event, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`rounded-full p-3 ${
                        event.type === "venda"
                          ? "bg-green-100 dark:bg-green-950"
                          : "bg-sky-100 dark:bg-sky-950"
                      }`}
                    >
                      <span className="text-2xl">
                        {event.type === "venda" ? "💰" : "📊"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {event.description}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {new Date(event.date).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <p className={`font-semibold ${
                    event.type === "venda"
                      ? "text-green-600 dark:text-green-400"
                      : "text-sky-600 dark:text-sky-400"
                  }`}>
                    {event.type === "venda" ? "+" : "-"}{formatBRL(event.value)}
                  </p>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                Nenhuma atividade recente
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <a
            href="/vendas-lg"
            className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <p className="text-2xl mb-2">📱</p>
            <p className="font-semibold text-zinc-900 dark:text-white">Lead Generation</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Gerenciar vendas
            </p>
          </a>

          <a
            href="/daily-ads"
            className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <p className="text-2xl mb-2">📊</p>
            <p className="font-semibold text-zinc-900 dark:text-white">Google Ads</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Controlar gastos
            </p>
          </a>

          <a
            href="/locations"
            className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <p className="text-2xl mb-2">🗺️</p>
            <p className="font-semibold text-zinc-900 dark:text-white">Mapa de Calor</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Localização das vendas
            </p>
          </a>

          <a
            href="/parceiros"
            className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <p className="text-2xl mb-2">👥</p>
            <p className="font-semibold text-zinc-900 dark:text-white">Parceiros</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Gerenciar parceiros
            </p>
          </a>

          <a
            href="/servicos"
            className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <p className="text-2xl mb-2">🔧</p>
            <p className="font-semibold text-zinc-900 dark:text-white">Serviços</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Catálogo de serviços
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
