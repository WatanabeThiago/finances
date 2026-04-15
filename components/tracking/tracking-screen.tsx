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

  const handleEditPhone = (event: TrackingEvent) => {
    setEditingId(event.id);
    setEditingPhone(event.phone || "");
  };

  const handleSavePhone = async (eventId: string) => {
    if (!editingPhone.trim()) {
      setEditingId(null);
      return;
    }

    setSavingId(eventId);
    try {
      const response = await fetch(`/api/tracking/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: editingPhone }),
      });

      if (!response.ok) throw new Error("Falha ao salvar telefone");

      // Atualizar evento localmente
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId ? { ...e, phone: editingPhone } : e
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

  // Filtrar apenas pessoas reais (sem bots)
  const realVisitors = useMemo(() => {
    return events.filter((e) => !e.is_bot);
  }, [events]);

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

    return {
      totalEvents: realVisitors.length,
      uniqueVisitors,
      eventCounts,
      topSource: topSource ? topSource[0] : "Direto",
      topMediumLabel: topMedium ? topMedium[0] : "N/A",
      totalBots,
      botPercentage: events.length > 0 ? ((totalBots / events.length) * 100).toFixed(1) : "0",
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
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-x-auto dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-white">
                Data/Hora
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-white">
                Evento
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-white">
                Visitor ID
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-white">
                Telefone
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-white">
                User Agent
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-white">
                Fonte (UTM)
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-white">
                Meio (UTM)
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-white">
                Campanha (UTM)
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-white">
                Conteúdo (UTM)
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-white">
                Palavra (UTM)
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-white">
                GCLID
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-white">
                FBCLID
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {groupedVisitors.length > 0 ? (
              groupedVisitors.map(([visitorId, eventList]) => (
                <Fragment key={visitorId}>
                  {/* Header do grupo */}
                  <tr className="bg-zinc-100 dark:bg-zinc-800">
                    <td colSpan={11} className="px-4 py-2 font-semibold text-zinc-900 dark:text-white text-sm">
                      👤 {visitorId.slice(0, 8)}...{visitorId.slice(-4)} | {eventList.length} evento{eventList.length !== 1 ? "s" : ""} {eventList.some((e) => e.phone) && `| 📞 ${eventList.find((e) => e.phone)?.phone}`}
                    </td>
                  </tr>
                  {/* Eventos do grupo */}
                  {eventList.map((event) => (
                    <tr
                      key={event.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs">
                        {new Date(event.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                        <span className="inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-sky-900 dark:bg-sky-950 dark:text-sky-200">
                          {event.event}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                        {editingId === event.id ? (
                          <div className="flex gap-2">
                        <input
                          type="tel"
                          value={editingPhone}
                          onChange={(e) => setEditingPhone(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="px-2 py-1 rounded border border-zinc-300 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSavePhone(event.id)}
                          disabled={savingId === event.id}
                          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                          title="Salvar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Cancelar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="text-zinc-900 dark:text-zinc-100 text-sm">
                              {event.phone ? event.phone : "—"}
                            </span>
                            <button
                              onClick={() => handleEditPhone(event)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                              title="Editar telefone"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 max-w-xs truncate text-xs">
                        {event.user_agent}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                        {event.utm_source ? (
                          <span className="inline-block rounded bg-violet-100 px-2 py-1 text-xs font-medium text-violet-900 dark:bg-violet-950 dark:text-violet-200">
                            {event.utm_source}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                        {event.utm_medium ? (
                          <span className="inline-block rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                            {event.utm_medium}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 text-xs">
                        {event.utm_campaign || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 text-xs">
                        {event.utm_content || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 text-xs">
                        {event.utm_term || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                        {event.gclid ? event.gclid.slice(0, 8) + "..." : "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                        {event.fbclid ? event.fbclid.slice(0, 8) + "..." : "—"}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  Nenhum evento de visitante real registrado ainda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {realVisitors.length > 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Total: {realVisitors.length} eventos de {stats.uniqueVisitors} visitantes únicos
        </p>
      )}
    </div>
  );
}
