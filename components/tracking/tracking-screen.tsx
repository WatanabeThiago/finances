"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { TrackingEvent } from "@/lib/tracking";

const StatCard = ({ label, value, change, color = "sky" }: { label: string; value: string; change?: string; color?: string }) => {
  const colorClasses = {
    sky: "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800",
    green: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
    red: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    amber: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    violet: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800",
    blue: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{value}</p>
      {change && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{change}</p>}
    </div>
  );
};

export function TrackingScreen() {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [togglingVendaId, setTogglingVendaId] = useState<string | null>(null);
  const [expandedVisitors, setExpandedVisitors] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "7days" | "30days" | "all">("all");
  const [syncResult, setSyncResult] = useState<{ matched: number; details: { visitor_id: string; phone: string; diff_seconds: number }[] } | null>(null);
  const [templates, setTemplates] = useState<{ id: string; text: string; active: boolean }[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTemplate, setNewTemplate] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  type AnalysisResult = {
    resumo: string;
    servico: string;
    converteu: boolean | null;
    confianca: number;
    dicas: string[];
    resposta_sugerida: string;
  };
  const [analysisCache, setAnalysisCache] = useState<Record<string, AnalysisResult | "loading" | "error">>({});

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/tracking");
        if (!response.ok) throw new Error("Falha ao carregar eventos");
        const data = await response.json();
        setEvents(data);
      } catch (err) {
        console.error("Erro ao carregar eventos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tracking");
      if (!response.ok) throw new Error("Falha ao carregar eventos");
      const data = await response.json();
      setEvents(data);
    } catch (err) {
      console.error("Erro ao carregar eventos:", err);
      alert("Erro ao recarregar eventos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/whatsapp/templates")
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => {});
  }, []);

  const handleAddTemplate = async () => {
    if (!newTemplate.trim()) return;
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newTemplate.trim() }),
      });
      if (!res.ok) throw new Error("Falha");
      const created = await res.json();
      setTemplates((prev) => [...prev, created]);
      setNewTemplate("");
    } catch {
      alert("Erro ao salvar template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    await fetch(`/api/whatsapp/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleTemplate = async (id: string, active: boolean) => {
    await fetch(`/api/whatsapp/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, active: !active } : t));
  };

  const handleAnalyze = async (phone: string, visitorId: string) => {
    setAnalysisCache((prev) => ({ ...prev, [visitorId]: "loading" }));
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na análise");
      setAnalysisCache((prev) => ({ ...prev, [visitorId]: data }));
    } catch {
      setAnalysisCache((prev) => ({ ...prev, [visitorId]: "error" }));
    }
  };

  const handleSyncPhones = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/tracking/sync-phones", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao sincronizar");
      setSyncResult(data);
      if (data.matched > 0) {
        // Recarregar eventos para mostrar os phones preenchidos
        const res = await fetch("/api/tracking");
        if (res.ok) setEvents(await res.json());
      }
    } catch (err) {
      console.error("Erro ao sincronizar:", err);
      alert("Erro ao sincronizar com WhatsApp");
    } finally {
      setSyncing(false);
    }
  };

  const handleEditPhone = (event: TrackingEvent) => {
    setEditingId(event.visitor_id);
    setEditingPhone(event.phone || "");
  };

  const handleSavePhone = async (visitorId: string) => {
    if (!editingPhone.trim()) {
      setEditingId(null);
      return;
    }

    setSavingId(visitorId);
    try {
      const response = await fetch(`/api/tracking/${visitorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: editingPhone }),
      });

      if (!response.ok) throw new Error("Falha ao salvar telefone");

      // Atualizar eventos localmente
      setEvents((prev) =>
        prev.map((e) =>
          e.visitor_id === visitorId ? { ...e, phone: editingPhone } : e
        )
      );
      setEditingId(null);
      setEditingPhone("");
    } catch (err) {
      console.error("Erro ao salvar telefone:", err);
      alert("Erro ao salvar telefone");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleVenda = async (visitorId: string, currentVenda: boolean) => {
    setTogglingVendaId(visitorId);
    try {
      const response = await fetch(`/api/tracking/${visitorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venda: !currentVenda }),
      });

      if (!response.ok) throw new Error("Falha ao atualizar venda");

      // Atualizar eventos localmente (todos do mesmo visitor)
      setEvents((prev) =>
        prev.map((e) =>
          e.visitor_id === visitorId ? { ...e, venda: !currentVenda } : e
        )
      );
    } catch (err) {
      console.error("Erro ao atualizar venda:", err);
      alert("Erro ao atualizar venda");
    } finally {
      setTogglingVendaId(null);
    }
  };

  const toggleExpanded = (visitorId: string) => {
    const newExpanded = new Set(expandedVisitors);
    if (newExpanded.has(visitorId)) {
      newExpanded.delete(visitorId);
    } else {
      newExpanded.add(visitorId);
    }
    setExpandedVisitors(newExpanded);
  };

  const formatTimeDifference = (current: string, next: string | null): string => {
    if (!next) return "";
    
    const currentTime = new Date(current).getTime();
    const nextTime = new Date(next).getTime();
    const diffMs = currentTime - nextTime;
    
    if (diffMs < 0) return "";
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getEventEmoji = (eventType: string): string => {
    switch (eventType.toLowerCase()) {
      case "page_view":
        return "📄";
      case "click":
        return "🫵";
      default:
        return "📍";
    }
  };

  // Filtrar apenas pessoas reais (sem bots)
  const realVisitors = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfToday);

    return events.filter((e) => {
      if (e.is_bot) return false;
      if (dateFilter === "all") return true;
      const eventDate = new Date(e.created_at);
      if (dateFilter === "today") return eventDate >= startOfToday;
      if (dateFilter === "yesterday") return eventDate >= startOfYesterday && eventDate < endOfYesterday;
      if (dateFilter === "7days") return eventDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (dateFilter === "30days") return eventDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return true;
    });
  }, [events, dateFilter]);

  // Agrupar por visitor_id e manter ordenação por data
  const groupedVisitors = useMemo(() => {
    const groups: Record<string, TrackingEvent[]> = {};
    
    realVisitors.forEach((event) => {
      if (!groups[event.visitor_id]) {
        groups[event.visitor_id] = [];
      }
      groups[event.visitor_id].push(event);
    });

    // Ordena cada grupo por data (decrescente) e depois ordena os grupos por data do evento mais recente
    Object.keys(groups).forEach((visitorId) => {
      groups[visitorId].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    // Ordena os grupos pela data do evento mais recente
    const sortedGroups = Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].created_at).getTime();
      const dateB = new Date(b[1][0].created_at).getTime();
      return dateB - dateA;
    });

    return sortedGroups;
  }, [realVisitors]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const uniqueVisitors = new Set(realVisitors.map((e) => e.visitor_id)).size;
    const totalBots = events.filter((e) => e.is_bot).length;
    
    const eventCounts: Record<string, number> = {};
    realVisitors.forEach((e) => {
      eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
    });

    const utmSources: Record<string, number> = {};
    realVisitors.forEach((e) => {
      if (e.utm_source) {
        utmSources[e.utm_source] = (utmSources[e.utm_source] || 0) + 1;
      }
    });

    const utmMediums: Record<string, number> = {};
    realVisitors.forEach((e) => {
      if (e.utm_medium) {
        utmMediums[e.utm_medium] = (utmMediums[e.utm_medium] || 0) + 1;
      }
    });

    const topSource = Object.entries(utmSources).sort((a, b) => b[1] - a[1])[0];
    const topMedium = Object.entries(utmMediums).sort((a, b) => b[1] - a[1])[0];

    const callVisitors = new Set(
      realVisitors.filter((e) => e.event === "call" || e.event === "click").map((e) => e.visitor_id)
    ).size;

    return {
      totalEvents: realVisitors.length,
      uniqueVisitors,
      eventCounts,
      topSource: topSource ? topSource[0] : "Direto",
      topMediumLabel: topMedium ? topMedium[0] : "N/A",
      totalBots,
      botPercentage: events.length > 0 ? ((totalBots / events.length) * 100).toFixed(1) : "0",
      callVisitors,
    };
  }, [realVisitors, events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-500">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 pb-28">
      <div>
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">
          📊 Tracking de Visitantes
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Análise de dados da landing page (apenas visitantes reais, bots excluídos)
        </p>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["today", "yesterday", "7days", "30days", "all"] as const).map((filter) => {
          const labels = { today: "Hoje", yesterday: "Ontem", "7days": "7 dias", "30days": "30 dias", all: "Todos" };
          return (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                dateFilter === filter
                  ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white"
                  : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
              }`}
            >
              {labels[filter]}
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {syncResult && (
          <span className={`text-sm px-3 py-1 rounded-lg ${syncResult.matched > 0 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
            {syncResult.matched > 0 ? `✅ ${syncResult.matched} telefone(s) preenchido(s)` : "Nenhum match encontrado"}
          </span>
        )}
        <button
          onClick={handleSyncPhones}
          disabled={syncing || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Correlacionar conversas do WhatsApp com visitantes"
        >
          <svg className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {syncing ? "Sincronizando..." : "Sincronizar WhatsApp"}
        </button>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Recarregar dados"
        >
          <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar
        </button>
      </div>

      {/* Templates WhatsApp */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <button
          onClick={() => setShowTemplates((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors rounded-xl"
        >
          <span>💬 Templates de Correlação WhatsApp ({templates.filter((t) => t.active).length} ativos)</span>
          <svg className={`w-4 h-4 transition-transform ${showTemplates ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {showTemplates && (
          <div className="px-4 pb-4 space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Mensagens que indicam que o contato veio da landing page. Usadas para correlacionar visitantes com conversas do WhatsApp.</p>
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  <button onClick={() => handleToggleTemplate(t.id, t.active)} className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${t.active ? "bg-green-500 border-green-500 text-white" : "border-zinc-300 dark:border-zinc-600"}`}>
                    {t.active && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <span className={`flex-1 font-mono text-xs ${t.active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 line-through"}`}>{t.text}</span>
                  <button onClick={() => handleDeleteTemplate(t.id)} className="shrink-0 text-zinc-400 hover:text-red-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTemplate()}
                placeholder="Novo template..."
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={handleAddTemplate}
                disabled={savingTemplate || !newTemplate.trim()}
                className="px-3 py-1.5 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                Adicionar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Total de Eventos"
          value={stats.totalEvents.toString()}
          change="Visitantes reais"
          color="sky"
        />
        <StatCard
          label="Visitantes Únicos"
          value={stats.uniqueVisitors.toString()}
          change="Pela sender IDs"
          color="green"
        />
        <StatCard
          label="Bots Detectados"
          value={stats.totalBots.toString()}
          change={`${stats.botPercentage}% do total`}
          color="red"
        />
        <StatCard
          label="Fonte Principal"
          value={stats.topSource}
          change="utm_source"
          color="violet"
        />
        <StatCard
          label="Meio Principal"
          value={stats.topMediumLabel}
          change="utm_medium"
          color="amber"
        />
        <StatCard
          label="Conversas Iniciadas"
          value={stats.callVisitors.toString()}
          change={stats.uniqueVisitors > 0 ? `${((stats.callVisitors / stats.uniqueVisitors) * 100).toFixed(0)}% dos visitantes` : "0% dos visitantes"}
          color="green"
        />
      </div>

      {/* Sessions Table */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-900 dark:bg-zinc-950">
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap sticky left-0 z-30 bg-zinc-900 dark:bg-zinc-950">
                  📅 Data/Hora
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  Eventos
                </th>
                <th className="px-4 py-3 text-center font-semibold text-white whitespace-nowrap">
                  Venda
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  📞 Telefone
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  🔑 Palavra-Chave (UTM)
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  🎯 Fonte (UTM)
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  📊 Meio (UTM)
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  🎪 Campanha (UTM)
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  📝 Conteúdo (UTM)
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  🔗 GCLID
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  📘 FBCLID
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  🏷️ MSCLKID
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  🌐 GAD Source
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  🔢 Campaign ID
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  📱 GBRAID
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  🔍 Keyword
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  📱 Device
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  🎯 Match Type
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  🌍 Network
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  📍 Grupo
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap">
                  Visitor ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {groupedVisitors.length > 0 ? (
                groupedVisitors.map(([visitorId, eventList]) => {
                  const firstEvent = eventList[0];
                  const isExpanded = expandedVisitors.has(visitorId);
                  return (
                    <Fragment key={visitorId}>
                      <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs sticky left-0 z-10 bg-white dark:bg-zinc-950 flex items-center gap-2">
                          <button
                            onClick={() => toggleExpanded(visitorId)}
                            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"
                            title={isExpanded ? "Recolher eventos" : "Expandir eventos"}
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <span>{new Date(firstEvent?.created_at || '').toLocaleString("pt-BR")}</span>
                        </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        <span className="inline-block bg-sky-100 dark:bg-sky-900/30 text-sky-900 dark:text-sky-200 px-2 py-1 rounded text-xs font-medium">
                          {eventList.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleVenda(visitorId, firstEvent?.venda || false)}
                          disabled={togglingVendaId === visitorId}
                          className="text-2xl transition-transform hover:scale-110 disabled:opacity-50 inline-block"
                        >
                          {firstEvent?.venda ? "✅" : "❌"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {editingId === visitorId ? (
                          <div className="flex gap-1">
                            <input
                              type="tel"
                              value={editingPhone}
                              onChange={(e) => setEditingPhone(e.target.value)}
                              placeholder="(11) 99999-9999"
                              className="px-2 py-1 rounded border border-zinc-300 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 w-40"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSavePhone(visitorId)}
                              disabled={savingId === visitorId}
                              className="text-green-600 hover:text-green-700 dark:text-green-400 disabled:opacity-50"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="text-sm font-mono">
                              {firstEvent?.phone ? firstEvent.phone : "—"}
                            </span>
                            {!editingId && (
                              <button
                                onClick={() => handleEditPhone(firstEvent)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                            {firstEvent?.phone && (
                              <button
                                onClick={() => handleAnalyze(firstEvent.phone!, visitorId)}
                                disabled={analysisCache[visitorId] === "loading"}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-violet-500 hover:text-violet-700 disabled:opacity-50"
                                title="Analisar conversa com IA"
                              >
                                {analysisCache[visitorId] === "loading" ? (
                                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                ) : (
                                  <span className="text-sm">🤖</span>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs">
                        {firstEvent?.utm_term ? (
                          <span className="inline-block bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200 px-2 py-1 rounded">
                            {firstEvent.utm_term}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs">
                        {firstEvent?.utm_source ? (
                          <span className="inline-block bg-violet-100 dark:bg-violet-900/30 text-violet-900 dark:text-violet-200 px-2 py-1 rounded">
                            {firstEvent.utm_source}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs">
                        {firstEvent?.utm_medium ? (
                          <span className="inline-block bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 px-2 py-1 rounded">
                            {firstEvent.utm_medium}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs">
                        {firstEvent?.utm_campaign || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs">
                        {firstEvent?.utm_content || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs font-mono">
                        {firstEvent?.gclid ? firstEvent.gclid.slice(0, 12) + "..." : "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs font-mono">
                        {firstEvent?.fbclid ? firstEvent.fbclid.slice(0, 12) + "..." : "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs font-mono">
                        {firstEvent?.msclkid ? firstEvent.msclkid.slice(0, 12) + "..." : "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs">
                        {firstEvent?.gad_source || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs">
                        {firstEvent?.gad_campaignid || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs font-mono">
                        {firstEvent?.gbraid ? firstEvent.gbraid.slice(0, 12) + "..." : "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs font-semibold">
                        {firstEvent?.keyword ? (
                          <span className="inline-block bg-pink-100 dark:bg-pink-900/30 text-pink-900 dark:text-pink-200 px-2 py-1 rounded">
                            {firstEvent.keyword}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs">
                        {firstEvent?.device ? (
                          <span className="inline-block bg-slate-100 dark:bg-slate-900/30 text-slate-900 dark:text-slate-200 px-2 py-1 rounded">
                            {firstEvent.device === 'm' ? '📱 Mobile' : firstEvent.device === 't' ? '🖥️ Desktop' : firstEvent.device === 'c' ? '📱 Tablet' : firstEvent.device}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs">
                        {firstEvent?.matchtype || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs">
                        {firstEvent?.network ? (
                          <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                            {firstEvent.network === 'g' ? '🔍 Search' : firstEvent.network === 's' ? '🔄 Partners' : firstEvent.network === 'd' ? '📺 Display' : firstEvent.network}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs font-semibold">
                        {firstEvent?.group ? (
                          <span className="inline-block bg-indigo-100 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200 px-2 py-1 rounded">
                            📍 {firstEvent.group}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {visitorId.slice(0, 8)}...{visitorId.slice(-4)}
                      </td>
                    </tr>
                    {analysisCache[visitorId] && analysisCache[visitorId] !== "loading" && (
                      <tr className="bg-violet-50/50 dark:bg-violet-950/20 border-b border-violet-100 dark:border-violet-900">
                        <td colSpan={21} className="px-6 py-4">
                          {analysisCache[visitorId] === "error" ? (
                            <p className="text-sm text-red-500">Erro ao analisar conversa. Verifique se o WAHA está rodando.</p>
                          ) : (() => {
                            const a = analysisCache[visitorId] as AnalysisResult;
                            return (
                              <div className="flex flex-wrap gap-6">
                                <div className="flex-1 min-w-60 space-y-2">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">🤖 {a.resumo}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.converteu === true ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : a.converteu === false ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                                      {a.converteu === true ? "✅ Converteu" : a.converteu === false ? "❌ Não converteu" : "⏳ Pendente"}
                                    </span>
                                    <span className="text-xs text-zinc-500">{a.servico}</span>
                                    <span className="text-xs text-zinc-400">{a.confianca}% confiança</span>
                                  </div>
                                  <ul className="space-y-1">
                                    {a.dicas.map((d, i) => (
                                      <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400">💡 {d}</li>
                                    ))}
                                  </ul>
                                </div>
                                {a.resposta_sugerida && (
                                  <div className="flex-1 min-w-60 space-y-1">
                                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Resposta sugerida:</p>
                                    <div className="flex items-start gap-2">
                                      <p className="text-sm text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 flex-1">{a.resposta_sugerida}</p>
                                      <button
                                        onClick={() => navigator.clipboard.writeText(a.resposta_sugerida)}
                                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mt-2 shrink-0"
                                        title="Copiar"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {a.converteu === true && !(firstEvent?.venda) && (
                                  <button
                                    onClick={() => handleToggleVenda(visitorId, false)}
                                    className="self-start text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors"
                                  >
                                    ✅ Marcar como venda
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    )}
                    {isExpanded && (
                      <tr className="bg-zinc-50 dark:bg-zinc-900/50">
                        <td colSpan={21} className="p-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
                              Eventos ({eventList.length})
                            </h4>
                            <div className="space-y-1 max-h-80 overflow-y-auto rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-3">
                              {eventList.map((event, idx) => {
                                const nextEvent = idx < eventList.length - 1 ? eventList[idx + 1] : null;
                                const timeDiff = formatTimeDifference(event.created_at, nextEvent?.created_at || null);
                                return (
                                  <div
                                    key={`${event.id}-${idx}`}
                                    className="text-xs p-2 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                                  >
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <div className="flex items-center gap-1">
                                            {event.event === "page_view" && (
                                              <span className="text-lg text-blue-600 dark:text-blue-400">📄</span>
                                            )}
                                            {event.event === "click" && (
                                              <span className="text-lg text-red-600 dark:text-red-400">🫵</span>
                                            )}
                                            {event.event !== "page_view" && event.event !== "click" && (
                                              <span className="text-lg text-purple-600 dark:text-purple-400">📍</span>
                                            )}
                                            <span className="font-semibold text-zinc-900 dark:text-white">
                                              {event.event}
                                            </span>
                                          </div>
                                          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                                            #{idx + 1}
                                          </span>
                                          {timeDiff && (
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600">
                                              +{timeDiff}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                                          {new Date(event.created_at).toLocaleString("pt-BR")}
                                        </div>
                                        <div className="text-zinc-600 dark:text-zinc-400 mt-1 break-words">
                                          <span className="text-xs">🔗 User-Agent: </span>
                                          <span className="font-mono text-xs">{event.user_agent}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={21} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    Nenhuma sessão registrada ainda
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {realVisitors.length > 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Total: {realVisitors.length} eventos de {stats.uniqueVisitors} visitantes únicos
        </p>
      )}
    </div>
  );
}
