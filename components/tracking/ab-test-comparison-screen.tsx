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
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { Trash2 } from "lucide-react";
import type { TrackingEvent } from "@/lib/tracking";
import { Skeleton } from "@/components/ui/skeleton";

interface AbTestComparisonScreenProps {
  events: TrackingEvent[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onEventsChange?: (updater: (prev: TrackingEvent[]) => TrackingEvent[]) => void;
}

const COLORS = {
  hero_v1_a: "#64748b", // slate-500
  hero_v1_b: "#10b981", // emerald-500
};

export type KeywordIntentCategory = "urgency" | "local" | "generic";

export function categorizeKeywordIntent(keyword?: string | null): {
  category: KeywordIntentCategory;
  label: string;
} {
  if (!keyword || !keyword.trim()) {
    return { category: "generic", label: "Genérico" };
  }
  const kw = keyword.toLowerCase().trim();

  // 1. Urgência / Emergência / 24h / Aberturas
  if (
    kw.includes("24") ||
    kw.includes("hora") ||
    kw.includes("abertura") ||
    kw.includes("abrir") ||
    kw.includes("urgente") ||
    kw.includes("emerg") ||
    kw.includes("socorro") ||
    kw.includes("trancad") ||
    kw.includes("perdi") ||
    kw.includes("fechadura")
  ) {
    return { category: "urgency", label: "🚨 Urgência / 24h" };
  }

  // 2. Bairro / Localidade específica da Grande Fpolis / SC
  const localTerms = [
    "palhoça", "palhoca", "florianopolis", "florianópolis", "floripa",
    "kobrasol", "serraria", "forquilhinhas", "itacorubi", "trindade",
    "biguaçu", "biguacu", "coqueiros", "centro", "lagoa", "barra",
    "ingleses", "campeche", "estreito", "campinas", "são josé", "sao jose",
    "bairro", "continente"
  ];

  if (localTerms.some((loc) => kw.includes(loc))) {
    return { category: "local", label: "📍 Bairro / Local" };
  }

  return { category: "generic", label: "🔍 Genérico" };
}

export function AbTestComparisonScreen({
  events,
  loading,
  onRefresh,
  onEventsChange,
}: AbTestComparisonScreenProps) {
  const [dateFilter, setDateFilter] = useState<
    "today" | "yesterday" | "7days" | "30days" | "thisMonth" | "all"
  >("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [selectedVariantModal, setSelectedVariantModal] = useState<string | null>(null);
  const [deletingVisitorId, setDeletingVisitorId] = useState<string | null>(null);
  const [copiedMd, setCopiedMd] = useState(false);

  const CAMPAIGN_NAMES: Record<string, string> = {
    "23799903003": "Campo Grande",
    "23740263027": "Lead Gen SC",
  };

  // Filtrar apenas sessões de TRÁFEGO PAGO legítimo (gclid, fbclid, msclkid) e sem bots
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
      // 1. Somente tráfego pago (cliques de anúncios com ID de clique de Google, Facebook ou Microsoft)
      const isPaidTraffic = Boolean(e.gclid || e.fbclid || e.msclkid);
      if (!isPaidTraffic) return false;

      // 2. Nunca considerar bots
      if (e.is_bot) return false;

      // 3. Filtro de campanha
      if (campaignFilter !== "all" && e.gad_campaignid !== campaignFilter) return false;

      // 4. Filtro de data
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
        intentStats: Record<
          KeywordIntentCategory,
          { total: number; wa: number; call: number; any: number }
        >;
        sessions: {
          session_number?: number | string | null;
          visitor_id: string;
          firstSeen: string;
          eventsCount: number;
          phone?: string;
          convertedWa: boolean;
          convertedCall: boolean;
          keyword?: string;
          intentCategory: KeywordIntentCategory;
          intentLabel: string;
          device?: string;
          timeSeconds: number | null;
          timeFormatted: string;
          isOutlier?: boolean;
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
        intentStats: {
          urgency: { total: 0, wa: 0, call: 0, any: 0 },
          local: { total: 0, wa: 0, call: 0, any: 0 },
          generic: { total: 0, wa: 0, call: 0, any: 0 },
        },
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
        intentStats: {
          urgency: { total: 0, wa: 0, call: 0, any: 0 },
          local: { total: 0, wa: 0, call: 0, any: 0 },
          generic: { total: 0, wa: 0, call: 0, any: 0 },
        },
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

      // Tempo de sessão / Tempo até a Conversão (CTA)
      // Ordena cronologicamente (mais antigo primeiro)
      const chronologicalEvents = [...evList].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const firstEv = chronologicalEvents[0];
      const isConvertedSession = isWa || isCall;

      let calculatedSecs: number | null = null;
      if (firstEv) {
        if (isConvertedSession) {
          // Sessão que converteu: do primeiro evento (page_view) até o PRIMEIRO CTA (whatsapp_click, call_click, etc.)
          const firstCtaEv = chronologicalEvents.find((e) =>
            e.event === "whatsapp_click" ||
            e.event === "click" ||
            e.event === "automotive_whatsapp_click" ||
            e.event === "board_repair_whatsapp_click" ||
            e.event === "call_click" ||
            e.event === "call" ||
            e.event === "automotive_call_click" ||
            e.event === "board_repair_call_click"
          );

          if (firstCtaEv) {
            calculatedSecs = Math.floor(
              (new Date(firstCtaEv.created_at).getTime() - new Date(firstEv.created_at).getTime()) / 1000
            );
          }
        } else {
          // Sessão que NÃO converteu: do primeiro evento até o último evento registrado na sessão
          const lastEv = chronologicalEvents[chronologicalEvents.length - 1];
          const updatedTime = first?.session_updated_at ? new Date(first.session_updated_at).getTime() : new Date(lastEv.created_at).getTime();
          calculatedSecs = Math.floor(
            (updatedTime - new Date(firstEv.created_at).getTime()) / 1000
          );
        }

        if (calculatedSecs !== null && calculatedSecs >= 0) {
          // Desconsidera outliers (> 15 minutos / 900s) para o cálculo da média
          if (calculatedSecs <= 900) {
            target.timeSpentSeconds.push(calculatedSecs);
          }
        }
      }

      // Device
      const dev = first?.device || "desconhecido";
      target.devices[dev] = (target.devices[dev] || 0) + 1;

      // Keyword & Intent Classification
      const intentInfo = categorizeKeywordIntent(first?.keyword);
      target.intentStats[intentInfo.category].total++;
      if (isWa) target.intentStats[intentInfo.category].wa++;
      if (isCall) target.intentStats[intentInfo.category].call++;
      if (isWa || isCall) target.intentStats[intentInfo.category].any++;

      if (first?.keyword) {
        target.keywords[first.keyword] = (target.keywords[first.keyword] || 0) + 1;
      }

      const formatTimeStr = (secs: number | null) => {
        if (secs === null || secs < 0) return "—";
        if (secs < 60) return `${secs}s`;
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        if (m < 60) return `${m}m ${s}s`;
        const h = Math.floor(m / 60);
        return `${h}h ${m % 60}m`;
      };

      const isOutlier = calculatedSecs !== null && calculatedSecs > 900; // > 15 minutos

      target.sessions.push({
        session_number: first?.session_number,
        visitor_id: vId,
        firstSeen: first?.created_at || "",
        eventsCount: evList.length,
        phone: first?.phone,
        convertedWa: isWa,
        convertedCall: isCall,
        keyword: first?.keyword,
        intentCategory: intentInfo.category,
        intentLabel: intentInfo.label,
        device: first?.device,
        timeSeconds: calculatedSecs,
        timeFormatted: formatTimeStr(calculatedSecs),
        isOutlier,
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

      const sortedTimes = [...data.timeSpentSeconds].sort((a, b) => a - b);
      const avgTime = sortedTimes.length
        ? Math.round(
            sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length
          )
        : 0;

      const medianTime = sortedTimes.length
        ? sortedTimes[Math.floor(sortedTimes.length / 2)]
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
        medianTime,
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

  // Evolução acumulada da Taxa de Conversão (CR %) ao longo do tempo por variante
  const crTimelineData = useMemo(() => {
    // Coleta todas as sessões das duas variantes
    const allSessions = [
      ...varA.sessions.map((s) => ({ ...s, variant: "hero_v1_a" })),
      ...varB.sessions.map((s) => ({ ...s, variant: "hero_v1_b" })),
    ].filter((s) => Boolean(s.firstSeen));

    // Ordena da mais antiga para a mais recente
    allSessions.sort(
      (a, b) => new Date(a.firstSeen).getTime() - new Date(b.firstSeen).getTime()
    );

    if (allSessions.length === 0) return [];

    // Agrupa por data (dia) no fuso horário de São Paulo
    const spDateFormat = (iso: string) => {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
      }).format(d);
    };

    const spDateFull = (iso: string) => {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
      }).format(new Date(iso));
    };

    // Mapa de dias ordenados
    const dayMap = new Map<
      string,
      {
        displayDate: string;
        sessionsA: typeof allSessions;
        sessionsB: typeof allSessions;
      }
    >();

    allSessions.forEach((s) => {
      const dayKey = spDateFull(s.firstSeen);
      const displayDate = spDateFormat(s.firstSeen);
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, { displayDate, sessionsA: [], sessionsB: [] });
      }
      const entry = dayMap.get(dayKey)!;
      if (s.variant === "hero_v1_a") {
        entry.sessionsA.push(s);
      } else {
        entry.sessionsB.push(s);
      }
    });

    let cumVisitorsA = 0;
    let cumConvertedA = 0;
    let cumVisitorsB = 0;
    let cumConvertedB = 0;

    const timeline: {
      date: string;
      rawDate: string;
      "Variante A (Controle)": number | null;
      "Variante B (Otimizada)": number | null;
      visitorsA: number;
      convertedA: number;
      visitorsB: number;
      convertedB: number;
    }[] = [];

    const sortedDays = Array.from(dayMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    sortedDays.forEach(([rawDate, data]) => {
      cumVisitorsA += data.sessionsA.length;
      cumConvertedA += data.sessionsA.filter(
        (s) => s.convertedWa || s.convertedCall
      ).length;

      cumVisitorsB += data.sessionsB.length;
      cumConvertedB += data.sessionsB.filter(
        (s) => s.convertedWa || s.convertedCall
      ).length;

      const crA =
        cumVisitorsA > 0
          ? Number(((cumConvertedA / cumVisitorsA) * 100).toFixed(1))
          : null;
      const crB =
        cumVisitorsB > 0
          ? Number(((cumConvertedB / cumVisitorsB) * 100).toFixed(1))
          : null;

      timeline.push({
        date: data.displayDate,
        rawDate,
        "Variante A (Controle)": crA,
        "Variante B (Otimizada)": crB,
        visitorsA: cumVisitorsA,
        convertedA: cumConvertedA,
        visitorsB: cumVisitorsB,
        convertedB: cumConvertedB,
      });
    });

    return timeline;
  }, [varA.sessions, varB.sessions]);

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

  const handleDeleteSession = async (visitorId: string) => {
    if (!confirm(`Tem certeza que deseja excluir todos os dados da sessão ${visitorId.slice(0, 8)}...? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setDeletingVisitorId(visitorId);
    try {
      const res = await fetch(`/api/tracking/${visitorId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao excluir sessão");
      }

      if (onEventsChange) {
        onEventsChange((prev) => prev.filter((e) => e.visitor_id !== visitorId));
      } else {
        await onRefresh();
      }
    } catch (err: any) {
      console.error("Erro ao excluir sessão:", err);
      alert(err.message || "Erro ao excluir sessão");
    } finally {
      setDeletingVisitorId(null);
    }
  };

  const handleExportMarkdown = () => {
    const periodLabel = {
      today: "Hoje",
      yesterday: "Ontem",
      "7days": "Últimos 7 dias",
      "30days": "Últimos 30 dias",
      thisMonth: "Este Mês",
      all: "Todo o Período",
    }[dateFilter];

    const campaignLabel = campaignFilter === "all" ? "Todas as Campanhas" : (CAMPAIGN_NAMES[campaignFilter] || campaignFilter);

    const nowStr = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const md = `# Relatório de Análise de Teste A/B — Hero (Dobra Principal)
> Gerado em: ${nowStr}
> Filtro de Período: ${periodLabel} | Campanha: ${campaignLabel}
> Tráfego analisado: Exclusivamente Tráfego Pago (Google Ads / Facebook Ads com GCLID/FBCLID/MSCLKID) | Bots 100% excluídos

---

## 1. Visão Geral Executiva
- **Amostra Total Testada**: ${totalSample} visitantes únicos qualificados de tráfego pago
- **Variante A (Controle - Original)**: ${varA.totalVisitors} visitantes (${totalSample > 0 ? Math.round((varA.totalVisitors / totalSample) * 100) : 0}% do tráfego)
- **Variante B (Otimizada - WhatsApp Dominante)**: ${varB.totalVisitors} visitantes (${totalSample > 0 ? Math.round((varB.totalVisitors / totalSample) * 100) : 0}% do tráfego)
- **Uplift na Taxa de WhatsApp (B vs A)**: ${upliftWa > 0 ? `+${upliftWa}%` : `${upliftWa}%`}
- **Uplift na Conversão Global (B vs A)**: ${upliftTotal > 0 ? `+${upliftTotal}%` : `${upliftTotal}%`}

---

## 2. Comparativo Detalhado de Métricas de Conversão

| Métrica | Variante A (Controle) | Variante B (Otimizada) | Diferença Absoluta | Uplift Relativo |
|---|---|---|---|---|
| **Layout / Hipótese** | Badge genérico, CTA padrão | WhatsApp dominante ("Chamar no WhatsApp") | — | — |
| **Visitantes Únicos** | ${varA.totalVisitors} | ${varB.totalVisitors} | ${varB.totalVisitors - varA.totalVisitors} | — |
| **Page Views** | ${varA.pageViews} | ${varB.pageViews} | ${varB.pageViews - varA.pageViews} | — |
| **Cliques WhatsApp** | ${varA.waCount} | ${varB.waCount} | ${varB.waCount - varA.waCount} | ${upliftWa > 0 ? `+${upliftWa}%` : `${upliftWa}%`} |
| **Taxa WhatsApp (CR %)** | **${varA.crWa}%** | **${varB.crWa}%** | ${(varB.crWa - varA.crWa).toFixed(2)} p.p. | ${upliftWa > 0 ? `+${upliftWa}%` : `${upliftWa}%`} |
| **Cliques Ligação** | ${varA.callCount} | ${varB.callCount} | ${varB.callCount - varA.callCount} | — |
| **Taxa Ligação (CR %)** | **${varA.crCall}%** | **${varB.crCall}%** | ${(varB.crCall - varA.crCall).toFixed(2)} p.p. | — |
| **Contatos Totais (Wa + Call)**| ${varA.anyCount} | ${varB.anyCount} | ${varB.anyCount - varA.anyCount} | ${upliftTotal > 0 ? `+${upliftTotal}%` : `${upliftTotal}%`} |
| **Taxa Global (CR %)** | **${varA.crTotal}%** | **${varB.crTotal}%** | ${(varB.crTotal - varA.crTotal).toFixed(2)} p.p. | ${upliftTotal > 0 ? `+${upliftTotal}%` : `${upliftTotal}%`} |
| **Profundidade Scroll Média** | ${varA.avgScroll}% | ${varB.avgScroll}% | ${(varB.avgScroll - varA.avgScroll).toFixed(0)} p.p. | — |
| **Tempo Médio de Decisão** | ${varA.avgTime}s | ${varB.avgTime}s | ${varB.avgTime - varA.avgTime}s | — |
| **Mediana de Tempo (Anti-Outlier)** | ${varA.medianTime}s | ${varB.medianTime}s | ${varB.medianTime - varA.medianTime}s | — |

> **Nota sobre o Tempo**: Para sessões que converteram, o tempo é medido estritamente desde a entrada (page_view) até o **1º clique no CTA** (WhatsApp ou Ligação). Para sessões que não converteram, é medido até o último evento registrado na página. Sessões com tempo > 15m são sinalizadas com ⚠️ (Outlier - aba deixada aberta) e são automaticamente excluídas do cálculo do Tempo Médio.

---

## 3. Dispositivos e Palavras-Chave

### Distribuição por Dispositivo
- **Variante A**: ${Object.entries(varA.devices).map(([k, v]) => `${k}: ${v}`).join(", ") || "Sem dados"}
- **Variante B**: ${Object.entries(varB.devices).map(([k, v]) => `${k}: ${v}`).join(", ") || "Sem dados"}

### Principais Palavras-Chave Buscadas
- **Variante A**: ${Object.entries(varA.keywords).slice(0, 5).map(([k, v]) => `"${k}" (${v})`).join(", ") || "Sem dados"}
- **Variante B**: ${Object.entries(varB.keywords).slice(0, 5).map(([k, v]) => `"${k}" (${v})`).join(", ") || "Sem dados"}

### Desempenho por Intenção da Busca (Urgência vs. Local vs. Genérico)

${(() => {
  const formatIntentRow = (
    label: string,
    statA: { total: number; wa: number; call: number; any: number },
    statB: { total: number; wa: number; call: number; any: number }
  ) => {
    const crA = statA.total > 0 ? (statA.any / statA.total) * 100 : 0;
    const crB = statB.total > 0 ? (statB.any / statB.total) * 100 : 0;
    const diff = crB - crA;
    const diffStr = statA.total === 0 && statB.total === 0 ? "—" : `${diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} p.p.`;
    return `| **${label}** | ${statA.total} vist. (${statA.any} conv. • **${crA.toFixed(1)}%**) | ${statB.total} vist. (${statB.any} conv. • **${crB.toFixed(1)}%**) | ${diffStr} |`;
  };

  return `| Categoria de Intenção | Variante A (Controle) | Variante B (Otimizada) | Diferença CR (B vs A) |
|---|---|---|---|
${formatIntentRow("🚨 Urgência / 24 Horas", varA.intentStats.urgency, varB.intentStats.urgency)}
${formatIntentRow("📍 Bairro / Localidade", varA.intentStats.local, varB.intentStats.local)}
${formatIntentRow("🔍 Genérico ('chaveiro')", varA.intentStats.generic, varB.intentStats.generic)}`;
})()}

---

## 4. Auditoria Individual de Sessões (Todos os Tempos)

| # Sessão | Data/Hora | Variante | Intenção | Tempo Registrado | Outlier? | Visitor ID | Keyword | Eventos | Converteu WA | Converteu Ligação | Telefone |
|---|---|---|---|---|---|---|---|---|---|---|---|
${[...varA.sessions.map(s => ({ ...s, variant: "hero_v1_a" })), ...varB.sessions.map(s => ({ ...s, variant: "hero_v1_b" }))]
  .sort((a, b) => new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime())
  .map(s => `| ${s.session_number ? `#${s.session_number}` : "—"} | ${s.firstSeen ? new Date(s.firstSeen).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"} | ${s.variant} | ${s.intentLabel} | ${s.timeFormatted} | ${s.isOutlier ? "⚠️ Sim (>15m)" : "Não"} | \`${s.visitor_id.slice(0, 8)}...\` | ${s.keyword || "—"} | ${s.eventsCount} | ${s.convertedWa ? "Sim" : "Não"} | ${s.convertedCall ? "Sim" : "Não"} | ${s.phone || "—"} |`)
  .join("\n")}

---

## 5. Instruções para o Especialista em CRO / Análise por IA
1. Avalie a significância estatística com base no tamanho da amostra (${totalSample} visitantes).
2. Compare a taxa de conversão direta em WhatsApp (canal preferencial) contra canibalização de ligações.
3. Observe se o tempo de tela e scroll indicam tomada de decisão rápida na Variante B.
4. Utilize a **Mediana de Tempo** e a coluna **Tempo Registrado** da tabela individual para desconsiderar distorções de usuários que deixaram a aba aberta por horas (outliers).
5. Analise o **Desempenho por Intenção da Busca**: verifique se a Variante B é superior tanto em termos de socorro imediato ("Urgência/24h") quanto em termos de busca de bairro ("Localidade").
6. Conclua com uma recomendação clara: Manter teste rodando, declarar Variante Vencedora (A ou B), ou sugerir iteração na cópia/CTA.
`;

    // Download do arquivo .md
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-teste-ab-hero-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Também copia para a área de transferência para colar direto no chat
    navigator.clipboard.writeText(md).then(() => {
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2500);
    }).catch(() => {});
  };

  if (loading && events.length === 0) {
    return <AbTestComparisonSkeleton />;
  }

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
                Comparativo estatístico de conversão e comportamento dos visitantes (Apenas tráfego pago)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportMarkdown}
            disabled={totalSample === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm disabled:opacity-50"
            title="Exportar arquivo .md formatado para análise com IA"
          >
            <span>📝</span>
            <span>{copiedMd ? "Baixado & Copiado!" : "Exportar Relatório p/ IA (.md)"}</span>
          </button>
          <Link
            href="/tracking"
            className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            ← Tracking Geral
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
              <span title="Para sessões que converteram: tempo até o 1º clique (CTA). Para as demais: tempo até o último evento. Exclui outliers > 15m.">
                Tempo Médio de Decisão:
              </span>
              <span className="font-semibold text-zinc-900 dark:text-white">{varA.avgTime}s</span>
            </div>
            <div className="flex justify-between py-1 text-zinc-600 dark:text-zinc-400">
              <span title="Mediana estatística: imune a sessões que deixaram a página aberta por horas (outliers).">
                Mediana de Tempo:
              </span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{varA.medianTime}s</span>
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
              <span title="Para sessões que converteram: tempo até o 1º clique (CTA). Para as demais: tempo até o último evento. Exclui outliers > 15m.">
                Tempo Médio de Decisão:
              </span>
              <span className="font-semibold text-zinc-900 dark:text-white">{varB.avgTime}s</span>
            </div>
            <div className="flex justify-between py-1 text-zinc-600 dark:text-zinc-400">
              <span title="Mediana estatística: imune a sessões que deixaram a página aberta por horas (outliers).">
                Mediana de Tempo:
              </span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{varB.medianTime}s</span>
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

      {/* Gráfico de Evolução da Taxa de Conversão ao Longo do Tempo */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2">
              <span>📈</span>
              <span>Evolução da Taxa de Conversão ao Longo do Tempo (CR % Acumulada)</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Acompanhamento diário da estabilidade e convergência da conversão (WhatsApp + Ligação) para cada variante
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              Variante A: <strong className="text-zinc-900 dark:text-white">{varA.crTotal}%</strong>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Variante B: <strong className="text-emerald-600 dark:text-emerald-400">{varB.crTotal}%</strong>
            </span>
          </div>
        </div>

        {crTimelineData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-zinc-400 text-xs">
            Sem dados suficientes para traçar a evolução no período selecionado.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={crTimelineData}
                margin={{ top: 15, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                  domain={[0, (dataMax: number) => Math.min(100, Math.max(50, Math.ceil(dataMax + 10)))]}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const dataPoint = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-xl text-xs space-y-2 text-white">
                          <p className="font-semibold text-zinc-300 border-b border-zinc-800 pb-1">
                            📅 Dia {label} (Acumulado até a data)
                          </p>
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <span className="w-2 h-2 rounded-full bg-slate-500" />
                              Variante A:
                            </span>
                            <span className="font-mono font-bold text-slate-200">
                              {dataPoint["Variante A (Controle)"] !== null
                                ? `${dataPoint["Variante A (Controle)"]}%`
                                : "—"}{" "}
                              <span className="text-[10px] text-zinc-500 font-normal">
                                ({dataPoint.convertedA}/{dataPoint.visitorsA} conv.)
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Variante B:
                            </span>
                            <span className="font-mono font-bold text-emerald-400">
                              {dataPoint["Variante B (Otimizada)"] !== null
                                ? `${dataPoint["Variante B (Otimizada)"]}%`
                                : "—"}{" "}
                              <span className="text-[10px] text-zinc-500 font-normal">
                                ({dataPoint.convertedB}/{dataPoint.visitorsB} conv.)
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="Variante A (Controle)"
                  stroke={COLORS.hero_v1_a}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLORS.hero_v1_a }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="Variante B (Otimizada)"
                  stroke={COLORS.hero_v1_b}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLORS.hero_v1_b }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Desempenho por Intenção da Busca */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
        <div className="mb-4">
          <h3 className="font-bold text-base text-zinc-900 dark:text-white">
            🎯 Desempenho por Intenção de Busca
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Comparativo de taxa de conversão segmentado por urgência imediata vs busca de bairro
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(
            [
              {
                key: "urgency" as const,
                label: "🚨 Urgência / 24 Horas",
                desc: "chaveiro 24h, abertura de fechaduras, socorro",
                color: "rose",
              },
              {
                key: "local" as const,
                label: "📍 Bairro / Localidade",
                desc: "chaveiro palhoça, kobrasol, trindade, etc.",
                color: "blue",
              },
              {
                key: "generic" as const,
                label: "🔍 Genérico ('chaveiro')",
                desc: "buscas amplas sem especificação de local/urgência",
                color: "zinc",
              },
            ] as const
          ).map((item) => {
            const statA = varA.intentStats[item.key];
            const statB = varB.intentStats[item.key];
            const crA = statA.total > 0 ? (statA.any / statA.total) * 100 : 0;
            const crB = statB.total > 0 ? (statB.any / statB.total) * 100 : 0;
            const diff = crB - crA;

            return (
              <div
                key={item.key}
                className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white">
                      {item.label}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        statA.total === 0 && statB.total === 0
                          ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                          : diff > 0
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : diff < 0
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800"
                      }`}
                    >
                      {statA.total === 0 && statB.total === 0
                        ? "Sem dados"
                        : `${diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} p.p.`}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{item.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      Variante A:
                    </span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {crA.toFixed(1)}% ({statA.any}/{statA.total})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Variante B:
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {crB.toFixed(1)}% ({statB.any}/{statB.total})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
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
                <th className="py-2.5 px-4"># Sessão</th>
                <th className="py-2.5 px-4">Data/Hora</th>
                <th className="py-2.5 px-4">Variante</th>
                <th className="py-2.5 px-4">⏱️ Tempo</th>
                <th className="py-2.5 px-4">Visitor ID</th>
                <th className="py-2.5 px-4">Keyword</th>
                <th className="py-2.5 px-4 text-center">Eventos</th>
                <th className="py-2.5 px-4 text-center">Converteu WhatsApp</th>
                <th className="py-2.5 px-4 text-center">Converteu Ligação</th>
                <th className="py-2.5 px-4">Telefone</th>
                <th className="py-2.5 px-4 text-center">Ações</th>
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
                      <td colSpan={11} className="py-8 text-center text-zinc-400 text-xs">
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
                    <td className="py-2.5 px-4 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {sess.session_number ? `#${sess.session_number}` : "—"}
                    </td>
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
                    <td className="py-2.5 px-4 text-xs font-mono whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          sess.isOutlier
                            ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded"
                            : "text-zinc-700 dark:text-zinc-300"
                        }`}
                        title={
                          sess.isOutlier
                            ? "Tempo muito longo (>15m). Aba provavelmente esquecida aberta."
                            : (sess.convertedWa || sess.convertedCall)
                            ? "Tempo até o 1º CTA"
                            : "Tempo até o último evento"
                        }
                      >
                        {sess.timeFormatted}
                        {sess.isOutlier && <span className="text-[10px]" title="Outlier">⚠️</span>}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-zinc-500 whitespace-nowrap">
                      {sess.visitor_id.slice(0, 8)}...{sess.visitor_id.slice(-4)}
                    </td>
                    <td className="py-2.5 px-4 text-xs font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap ${
                            sess.intentCategory === "urgency"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : sess.intentCategory === "local"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                          title={`Intenção detectada: ${sess.intentLabel}`}
                        >
                          {sess.intentLabel}
                        </span>
                        {sess.keyword ? (
                          <span className="bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded">
                            {sess.keyword}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </div>
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
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteSession(sess.visitor_id)}
                        disabled={deletingVisitorId === sess.visitor_id}
                        title="Excluir esta sessão e seus eventos"
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                      >
                        {deletingVisitorId === sess.visitor_id ? (
                          <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
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

export function AbTestComparisonSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-28">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 sm:w-80" />
            <Skeleton className="h-4 w-72 sm:w-96" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-44 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Filtros de Data e Campanha */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-4 w-14" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 sm:w-20 rounded-lg" />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-4 w-16" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 sm:w-24 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Destaque de Vencedor / Uplift */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>

      {/* Cards Lado a Lado: Variante A vs Variante B */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-6 w-36" />
                </div>
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-2"
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-24" />
                  <Skeleton className="h-2.5 w-28" />
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos de Comparação e Distribuição */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-3 w-80" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex items-center justify-center my-4">
            <Skeleton className="h-44 w-44 rounded-full" />
          </div>
          <Skeleton className="h-3 w-36 mx-auto" />
        </div>
      </div>

      {/* Skeleton para Gráfico de Evolução ao Longo do Tempo */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <Skeleton className="h-5 w-72" />
            <Skeleton className="h-3 w-96" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>

      {/* Desempenho por Intenção da Busca */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-5 w-60" />
          <Skeleton className="h-3 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-4"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
              <Skeleton className="h-3 w-44" />
              <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-800 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela de Amostras Recentes das Variantes */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded-lg" />
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 py-2 border-b border-zinc-100 dark:border-zinc-800/60 last:border-none"
            >
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-36 rounded" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-6 rounded-lg ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
