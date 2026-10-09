"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { TrackingEvent } from "@/lib/tracking";

interface AbTestComparisonScreenProps {
  events: TrackingEvent[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

const COLORS = {
  hero_v1_a: "#64748b", // slate-500
  hero_v1_b: "#10b981", // emerald-500
};

export function AbTestComparisonScreen({
  events,
  loading,
  onRefresh,
}: AbTestComparisonScreenProps) {
  const [dateFilter, setDateFilter] = useState<
    "today" | "yesterday" | "7days" | "30days" | "thisMonth" | "all"
  >("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [selectedVariantModal, setSelectedVariantModal] = useState<string | null>(null);

  const CAMPAIGN_NAMES: Record<string, string> = {
    "23799903003": "Campo Grande",
    "23740263027": "Lead Gen SC",
  };

  // Filtrar eventos reais
  const filteredEvents = useMemo(() => {
    const spDate = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
    const now = new Date();
    const todaySp = spDate(now);
    const yesterdaySp = spDate(new Date(now.getTime() - 86400000));
    const sevenDaysAgoSp = spDate(new Date(now.getTime() - 7 * 86400000));
    const thirtyDaysAgoSp = spDate(new Date(now.getTime() - 30 * 86400000));
    const thisMonthPrefix = todaySp.substring(0, 7);

    return events.filter((e) => {
      // Ignorar bots nos testes A/B
      if (e.is_bot && !e.gclid && !e.fbclid && !e.msclkid) return false;
      if (campaignFilter !== "all" && e.gad_campaignid !== campaignFilter) return false;

      if (dateFilter === "all") return true;
      const eventDateSp = spDate(new Date(e.created_at));
      if (dateFilter === "today") return eventDateSp === todaySp;
      if (dateFilter === "yesterday") return eventDateSp === yesterdaySp;
      if (dateFilter === "7days") return eventDateSp >= sevenDaysAgoSp;
      if (dateFilter === "30days") return eventDateSp >= thirtyDaysAgoSp;
      if (dateFilter === "thisMonth") return eventDateSp.startsWith(thisMonthPrefix);
      return true;
    });
  }, [events, dateFilter, campaignFilter]);

  // Agrupar por visitante
  const visitorSessions = useMemo(() => {
    const map: Record<string, TrackingEvent[]> = {};
    filteredEvents.forEach((ev) => {
      if (!map[ev.visitor_id]) map[ev.visitor_id] = [];
      map[ev.visitor_id].push(ev);
    });
    return map;
  }, [filteredEvents]);

  // Cálculos A/B detalhados por variante
  const abStats = useMemo(() => {
    const variants: Record<
      string,
      {
        variant: string;
        name: string;
        description: string;
        visitors: Set<string>;
        pageViews: number;
        whatsappClicks: number;
        callClicks: number;
        otherClicks: number;
        convertedVisitorsWa: Set<string>;
        convertedVisitorsCall: Set<string>;
        convertedVisitorsAny: Set<string>;
        scrollDepths: number[];
        timeSpentSeconds: number[];
        devices: Record<string, number>;
        keywords: Record<string, number>;
        sessions: {
          visitor_id: string;
          firstSeen: string;
          eventsCount: number;
          phone?: string;
          convertedWa: boolean;
          convertedCall: boolean;
          keyword?: string;
          device?: string;
        }[];
      }
    > = {
      hero_v1_a: {
        variant: "hero_v1_a",
        name: "Variante A (Controle)",
        description: "Layout Original - Badge genérico, CTA padrão",
        visitors: new Set(),
        pageViews: 0,
        whatsappClicks: 0,
        callClicks: 0,
        otherClicks: 0,
        convertedVisitorsWa: new Set(),
        convertedVisitorsCall: new Set(),
        convertedVisitorsAny: new Set(),
        scrollDepths: [],
        timeSpentSeconds: [],
        devices: {},
        keywords: {},
        sessions: [],
      },
      hero_v1_b: {
        variant: "hero_v1_b",
        name: "Variante B (Otimizada)",
        description: "WhatsApp Dominante - 'Chamar no WhatsApp', ligar secundário",
        visitors: new Set(),
        pageViews: 0,
        whatsappClicks: 0,
        callClicks: 0,
        otherClicks: 0,
        convertedVisitorsWa: new Set(),
        convertedVisitorsCall: new Set(),
        convertedVisitorsAny: new Set(),
        scrollDepths: [],
        timeSpentSeconds: [],
        devices: {},
        keywords: {},
        sessions: [],
      },
    };

    Object.entries(visitorSessions).forEach(([vId, evList]) => {
      const first = evList[0];
      // Variante associada ao evento ou sessão
      const variant =
        evList.find((e) => e.ab_variant)?.ab_variant || first?.ab_variant;

      if (!variant || !variants[variant]) {
        // Se não for 'hero_v1_a' ou 'hero_v1_b', ignora no relatório de teste principal
        return;
      }

      const target = variants[variant];
      target.visitors.add(vId);

      let isWa = false;
      let isCall = false;

      evList.forEach((e) => {
        if (e.event === "page_view") target.pageViews++;
        else if (
          e.event === "whatsapp_click" ||
          e.event === "click" ||
          e.event === "automotive_whatsapp_click" ||
          e.event === "board_repair_whatsapp_click"
        ) {
          target.whatsappClicks++;
          isWa = true;
        } else if (
          e.event === "call_click" ||
          e.event === "call" ||
          e.event === "automotive_call_click" ||
          e.event === "board_repair_call_click"
        ) {
          target.callClicks++;
          isCall = true;
        } else {
          target.otherClicks++;
        }
      });

      if (isWa) {
        target.convertedVisitorsWa.add(vId);
        target.convertedVisitorsAny.add(vId);
      }
      if (isCall) {
        target.convertedVisitorsCall.add(vId);
        target.convertedVisitorsAny.add(vId);
      }

      // Max scroll
      const depths = [100, 75, 50, 35, 25, 10];
      const maxScroll = depths.find((d) => evList.some((e) => e.event === `scroll_${d}`)) || 0;
      target.scrollDepths.push(maxScroll);

      // Tempo de sessão
      const updated = first?.session_updated_at;
      const oldestEvent = evList[evList.length - 1];
      const start = oldestEvent?.created_at;
      if (start && updated) {
        const secs = Math.floor(
          (new Date(updated).getTime() - new Date(start).getTime()) / 1000
        );
        if (secs >= 0 && secs <= 3600) {
          target.timeSpentSeconds.push(secs);
        }
      }

      // Device
      const dev = first?.device || "desconhecido";
      target.devices[dev] = (target.devices[dev] || 0) + 1;

      // Keyword
      if (first?.keyword) {
        target.keywords[first.keyword] = (target.keywords[first.keyword] || 0) + 1;
      }

      target.sessions.push({
        visitor_id: vId,
        firstSeen: first?.created_at || "",
        eventsCount: evList.length,
        phone: first?.phone,
        convertedWa: isWa,
        convertedCall: isCall,
        keyword: first?.keyword,
        device: first?.device,
      });
    });

    const getMetrics = (data: typeof variants["hero_v1_a"]) => {
      const totalVisitors = data.visitors.size;
      const waCount = data.convertedVisitorsWa.size;
      const callCount = data.convertedVisitorsCall.size;
      const anyCount = data.convertedVisitorsAny.size;

      const crWa = totalVisitors > 0 ? (waCount / totalVisitors) * 100 : 0;
      const crCall = totalVisitors > 0 ? (callCount / totalVisitors) * 100 : 0;
      const crTotal = totalVisitors > 0 ? (anyCount / totalVisitors) * 100 : 0;

      const avgScroll = data.scrollDepths.length
        ? Math.round(
            data.scrollDepths.reduce((a, b) => a + b, 0) / data.scrollDepths.length
          )
        : 0;

      const avgTime = data.timeSpentSeconds.length
        ? Math.round(
            data.timeSpentSeconds.reduce((a, b) => a + b, 0) /
              data.timeSpentSeconds.length
          )
        : 0;

      return {
        ...data,
        totalVisitors,
        waCount,
        callCount,
        anyCount,
        crWa: Number(crWa.toFixed(2)),
        crCall: Number(crCall.toFixed(2)),
        crTotal: Number(crTotal.toFixed(2)),
        avgScroll,
        avgTime,
      };
    };

    const varA = getMetrics(variants.hero_v1_a);
    const varB = getMetrics(variants.hero_v1_b);

    // Comparação e Uplift (B vs A)
    let upliftWa = 0;
    let upliftTotal = 0;
    if (varA.crWa > 0) {
      upliftWa = Number((((varB.crWa - varA.crWa) / varA.crWa) * 100).toFixed(1));
    } else if (varB.crWa > 0) {
      upliftWa = 100;
    }

    if (varA.crTotal > 0) {
      upliftTotal = Number(
        (((varB.crTotal - varA.crTotal) / varA.crTotal) * 100).toFixed(1)
      );
    } else if (varB.crTotal > 0) {
      upliftTotal = 100;
    }

    // Amostragem total do teste
    const totalSample = varA.totalVisitors + varB.totalVisitors;

    return {
      varA,
      varB,
      upliftWa,
      upliftTotal,
      totalSample,
    };
  }, [visitorSessions]);

  const { varA, varB, upliftWa, upliftTotal, totalSample } = abStats;

  // Gráfico de comparação direta
  const chartData = [
    {
      metric: "Taxa WhatsApp (CR %)",
      "Variante A (Controle)": varA.crWa,
      "Variante B (Otimizada)": varB.crWa,
    },
    {
      metric: "Taxa Total (WhatsApp + Call %)",
      "Variante A (Controle)": varA.crTotal,
      "Variante B (Otimizada)": varB.crTotal,
    },
    {
      metric: "Scroll Médio (%)",
      "Variante A (Controle)": varA.avgScroll,
      "Variante B (Otimizada)": varB.avgScroll,
    },
  ];

  // Pizza de distribuição de tráfego
  const trafficPieData = [
    { name: "Variante A", value: varA.totalVisitors, color: COLORS.hero_v1_a },
    { name: "Variante B", value: varB.totalVisitors, color: COLORS.hero_v1_b },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-28">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧪</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                Teste A/B: Dobra Principal (Hero)
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Comparativo estatístico de conversão e comportamento dos visitantes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/tracking"
            className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            ← Voltar para Tracking Geral
          </Link>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Atualizar
          </button>
        </div>
      </div>

      {/* Filtros de Data e Campanha */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Período:
          </span>
          {(
            [
              "today",
              "yesterday",
              "7days",
              "30days",
              "thisMonth",
              "all",
            ] as const
          ).map((filter) => {
            const labels = {
              today: "Hoje",
              yesterday: "Ontem",
              "7days": "7 dias",
              "30days": "30 dias",
              thisMonth: "Esse Mês",
              all: "Todo Período",
            };
            return (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  dateFilter === filter
                    ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white"
                    : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700"
                }`}
              >
                {labels[filter]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Campanha:
          </span>
          <button
            onClick={() => setCampaignFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              campaignFilter === "all"
                ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white"
                : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700"
            }`}
          >
            Todas
          </button>
          {Object.entries(CAMPAIGN_NAMES).map(([id, name]) => (
            <button
              key={id}
              onClick={() => setCampaignFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                campaignFilter === id
                  ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white"
                  : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Destaque de Vencedor / Uplift */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Uplift WhatsApp */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              📲 Uplift CR WhatsApp (B vs A)
            </span>
            <span className="text-lg">⚡</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-4xl font-black ${
                upliftWa >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
              }`}
            >
              {upliftWa > 0 ? `+${upliftWa}%` : `${upliftWa}%`}
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            {varB.crWa >= varA.crWa
              ? "A Variante B está gerando mais conversões de WhatsApp por visitante."
              : "A Variante A está temporariamente liderando em cliques no WhatsApp."}
          </p>
        </div>

        {/* Card Uplift Total */}
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
              🏆 Uplift Conversão Global
            </span>
            <span className="text-lg">🎯</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-4xl font-black ${
                upliftTotal >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600"
              }`}
            >
              {upliftTotal > 0 ? `+${upliftTotal}%` : `${upliftTotal}%`}
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            Soma de contatos iniciados (WhatsApp ou Ligação direta).
          </p>
        </div>

        {/* Card Amostragem do Teste */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              👥 Volume de Amostra Testada
            </span>
            <span className="text-lg">📊</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-zinc-900 dark:text-white">
              {totalSample}
            </span>
            <span className="text-xs text-zinc-500">visitantes únicos</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            <span>A: {varA.totalVisitors} ({totalSample > 0 ? Math.round((varA.totalVisitors / totalSample) * 100) : 0}%)</span>
            <span>•</span>
            <span>B: {varB.totalVisitors} ({totalSample > 0 ? Math.round((varB.totalVisitors / totalSample) * 100) : 0}%)</span>
          </div>
        </div>
      </div>

      {/* Cards Lado a Lado: Variante A vs Variante B */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box Variante A */}
        <div className="rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                  hero_v1_a
                </span>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
                  Controle (Original)
                </h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {varA.description}
              </p>
            </div>
            <span className="text-2xl">🏛️</span>
          </div>

          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">CR WhatsApp</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {varA.crWa}%
              </p>
              <span className="text-[11px] text-zinc-400">
                {varA.waCount} de {varA.totalVisitors} visitantes
              </span>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">CR Total</span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {varA.crTotal}%
              </p>
              <span className="text-[11px] text-zinc-400">
                {varA.anyCount} contatos totais
              </span>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Page Views</span>
              <p className="text-xl font-bold text-zinc-900 dark:text-white mt-1">
                {varA.pageViews}
              </p>
              <span className="text-[11px] text-zinc-400">visualizações registradas</span>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Ligações (Cliques)</span>
              <p className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1">
                {varA.callCount}
              </p>
              <span className="text-[11px] text-zinc-400">taxa {varA.crCall}%</span>
            </div>
          </div>

          <div className="space-y-2 text-xs border-t border-zinc-100 dark:border-zinc-800/80 pt-4">
            <div className="flex justify-between py-1 text-zinc-600 dark:text-zinc-400">
              <span>Scroll Médio:</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{varA.avgScroll}%</span>
            </div>
            <div className="flex justify-between py-1 text-zinc-600 dark:text-zinc-400">
              <span>Tempo Médio na Página:</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{varA.avgTime}s</span>
            </div>
          </div>
        </div>

        {/* Box Variante B */}
        <div className="rounded-2xl border-2 border-emerald-500/80 dark:border-emerald-500/70 bg-white dark:bg-zinc-950 p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] uppercase font-black px-3 py-1 rounded-bl-lg tracking-wider">
            Nova Hipótese
          </div>

          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  hero_v1_b
                </span>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
                  Otimizada (WhatsApp Dominante)
                </h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {varB.description}
              </p>
            </div>
            <span className="text-2xl">🚀</span>
          </div>

          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50">
              <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">CR WhatsApp</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {varB.crWa}%
              </p>
              <span className="text-[11px] text-zinc-400">
                {varB.waCount} de {varB.totalVisitors} visitantes
              </span>
            </div>

            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50">
              <span className="text-xs text-indigo-800 dark:text-indigo-300 font-medium">CR Total</span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {varB.crTotal}%
              </p>
              <span className="text-[11px] text-zinc-400">
                {varB.anyCount} contatos totais
              </span>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Page Views</span>
              <p className="text-xl font-bold text-zinc-900 dark:text-white mt-1">
                {varB.pageViews}
              </p>
              <span className="text-[11px] text-zinc-400">visualizações registradas</span>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Ligações (Cliques)</span>
              <p className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1">
                {varB.callCount}
              </p>
              <span className="text-[11px] text-zinc-400">taxa {varB.crCall}%</span>
            </div>
          </div>

          <div className="space-y-2 text-xs border-t border-zinc-100 dark:border-zinc-800/80 pt-4">
            <div className="flex justify-between py-1 text-zinc-600 dark:text-zinc-400">
              <span>Scroll Médio:</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{varB.avgScroll}%</span>
            </div>
            <div className="flex justify-between py-1 text-zinc-600 dark:text-zinc-400">
              <span>Tempo Médio na Página:</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{varB.avgTime}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos de Comparação e Distribuição */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
          <h3 className="font-bold text-base text-zinc-900 dark:text-white mb-1">
            📊 Comparativo Direto de Desempenho (%)
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
            Taxa de conversão e engajamento comparando hero_v1_a e hero_v1_b
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="metric" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    backgroundColor: "#18181b",
                    color: "#fff",
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: "15px" }} />
                <Bar dataKey="Variante A (Controle)" fill={COLORS.hero_v1_a} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Variante B (Otimizada)" fill={COLORS.hero_v1_b} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-white mb-1">
              ⚖️ Split de Tráfego
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Distribuição de visitantes únicos entre as duas variantes
            </p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trafficPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {trafficPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    backgroundColor: "#18181b",
                    color: "#fff",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-xs text-zinc-400 font-mono mt-2">
            Target ideal do algoritmo: 50% / 50%
          </div>
        </div>
      </div>

      {/* Tabela de Amostras Recentes das Variantes */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-white">
              📋 Sessões Recentes do Experimento A/B
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Auditoria individual dos visitantes atribuídos ao teste
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedVariantModal(null)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                selectedVariantModal === null
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
              }`}
            >
              Todas ({varA.sessions.length + varB.sessions.length})
            </button>
            <button
              onClick={() => setSelectedVariantModal("hero_v1_a")}
              className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                selectedVariantModal === "hero_v1_a"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
              }`}
            >
              A ({varA.sessions.length})
            </button>
            <button
              onClick={() => setSelectedVariantModal("hero_v1_b")}
              className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                selectedVariantModal === "hero_v1_b"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
              }`}
            >
              B ({varB.sessions.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
              <tr className="text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <th className="py-2.5 px-4">Data/Hora</th>
                <th className="py-2.5 px-4">Variante</th>
                <th className="py-2.5 px-4">Visitor ID</th>
                <th className="py-2.5 px-4">Keyword</th>
                <th className="py-2.5 px-4 text-center">Eventos</th>
                <th className="py-2.5 px-4 text-center">Converteu WhatsApp</th>
                <th className="py-2.5 px-4 text-center">Converteu Ligação</th>
                <th className="py-2.5 px-4">Telefone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(() => {
                let list = [
                  ...varA.sessions.map((s) => ({ ...s, variant: "hero_v1_a" })),
                  ...varB.sessions.map((s) => ({ ...s, variant: "hero_v1_b" })),
                ];

                if (selectedVariantModal) {
                  list = list.filter((s) => s.variant === selectedVariantModal);
                }

                list.sort(
                  (a, b) =>
                    new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime()
                );

                if (list.length === 0) {
                  return (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-400 text-xs">
                        Nenhuma sessão com variante A/B registrada no filtro atual.
                      </td>
                    </tr>
                  );
                }

                return list.map((sess) => (
                  <tr
                    key={sess.visitor_id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-xs font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {sess.firstSeen
                        ? new Date(sess.firstSeen).toLocaleString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                          })
                        : "—"}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          sess.variant === "hero_v1_b"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {sess.variant}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-zinc-500 whitespace-nowrap">
                      {sess.visitor_id.slice(0, 8)}...{sess.visitor_id.slice(-4)}
                    </td>
                    <td className="py-2.5 px-4 text-xs font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {sess.keyword ? (
                        <span className="bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded">
                          {sess.keyword}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center text-xs font-semibold">
                      {sess.eventsCount}
                    </td>
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      {sess.convertedWa ? (
                        <span className="text-emerald-600 font-bold">✅ Sim</span>
                      ) : (
                        <span className="text-zinc-300 dark:text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      {sess.convertedCall ? (
                        <span className="text-sky-600 font-bold">📞 Sim</span>
                      ) : (
                        <span className="text-zinc-300 dark:text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                      {sess.phone || "—"}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
