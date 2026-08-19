"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  isValidBrazilianDate,
  type DailyAdsRecord,
} from "@/lib/daily-ads";
import type { VendaLg } from "@/lib/venda-lg";
import type { TrackingEvent } from "@/lib/tracking";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const numberFormatter = new Intl.NumberFormat("pt-BR");
const ratioFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const campoGrandeDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Campo_Grande",
});

type SortKey =
  | "date"
  | "result"
  | "commission"
  | "spend"
  | "cpc"
  | "clicks"
  | "impressions"
  | "revenue"
  | "cpa"
  | "roas"
  | "clients"
  | "averageCommission";
type SortDirection = "asc" | "desc";

type DailyMetrics = {
  clicks: number;
  revenue: number;
  result: number;
  commission: number;
  cpa: number;
  roas: number;
  clients: number;
  averageCommission: number;
  conversations: number;
};

type DailyAdsDisplayRecord = DailyAdsRecord & DailyMetrics;

type SortButtonProps = {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  align?: "left" | "right";
  onSort: (key: SortKey) => void;
};

function SortButton({
  label,
  sortKey,
  activeKey,
  direction,
  align = "right",
  onSort,
}: SortButtonProps) {
  const active = sortKey === activeKey;
  const Icon = active
    ? direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`flex min-h-9 w-full items-center gap-1.5 rounded-lg px-3 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 ${
        align === "right" ? "justify-end" : "justify-start"
      } ${active ? "text-blue-600 dark:text-blue-400" : ""}`}
      aria-label={`Ordenar por ${label} em ordem ${
        active && direction === "asc" ? "decrescente" : "crescente"
      }`}
    >
      {label}
      <Icon aria-hidden="true" size={13} strokeWidth={2.2} />
    </button>
  );
}

function maskDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDecimal(value: string) {
  return Number(value.replace(",", "."));
}

function calculateClicks(spend: number, cpc: number) {
  return cpc > 0 ? Math.round(spend / cpc) : 0;
}

function dateToTimestamp(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  return Date.UTC(year, month - 1, day);
}

function FunnelView({ item }: { item: DailyAdsDisplayRecord }) {
  const conversations = item.conversations;

  const ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0;
  const clickToConv = item.clicks > 0 ? (conversations / item.clicks) * 100 : 0;
  const convToSale = conversations > 0 ? (item.clients / conversations) * 100 : 0;

  const cpm = item.impressions > 0 ? (item.spend / item.impressions) * 1000 : 0;
  const cpc = item.clicks > 0 ? item.spend / item.clicks : 0;
  const costPerConv = conversations > 0 ? item.spend / conversations : 0;
  const cpa = item.clients > 0 ? item.spend / item.clients : 0;

  return (
    <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950/50">
      <div className="mb-5 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Funil de Vendas
        </h4>
      </div>
      
      <div className="flex flex-col items-center gap-3 xl:flex-row xl:gap-4">
        {/* Impressões */}
        <div className="flex w-full flex-1 flex-col items-center rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Impressões</span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {numberFormatter.format(item.impressions)}
          </span>
          <span className="mt-2 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
            CPM: {currencyFormatter.format(cpm)}
          </span>
        </div>

        {/* CTR */}
        <div className="flex flex-col items-center">
          <span className="mb-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 sm:text-xs">
            CTR: {ratioFormatter.format(ctr)}%
          </span>
          <ArrowRight className="hidden text-zinc-300 xl:block dark:text-zinc-700" size={20} />
          <ArrowDown className="text-zinc-300 xl:hidden dark:text-zinc-700" size={20} />
        </div>

        {/* Cliques */}
        <div className="flex w-full flex-1 flex-col items-center rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Cliques</span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {numberFormatter.format(item.clicks)}
          </span>
          <span className="mt-2 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
            CPC: {currencyFormatter.format(cpc)}
          </span>
        </div>

        {/* Click to Conv */}
        <div className="flex flex-col items-center">
          <span className="mb-1 rounded-md bg-purple-50 px-2 py-1 text-[10px] font-semibold text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 sm:text-xs">
            Tx. Conv: {ratioFormatter.format(clickToConv)}%
          </span>
          <ArrowRight className="hidden text-zinc-300 xl:block dark:text-zinc-700" size={20} />
          <ArrowDown className="text-zinc-300 xl:hidden dark:text-zinc-700" size={20} />
        </div>

        {/* Conversas (Automático) */}
        <div className="relative flex w-full flex-1 flex-col items-center rounded-xl border border-purple-100 bg-purple-50/50 p-4 dark:border-purple-900/30 dark:bg-purple-950/20">
          <span className="text-xs font-medium uppercase tracking-wide text-purple-700 dark:text-purple-500">Conversas</span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-purple-900 dark:text-purple-50">
            {numberFormatter.format(conversations)}
          </span>
          <span className="mt-2 text-[10px] font-semibold text-purple-600/70 dark:text-purple-500/70">
            CPL: {currencyFormatter.format(costPerConv)}
          </span>
        </div>

        {/* Conv to Sale */}
        <div className="flex flex-col items-center">
          <span className="mb-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 sm:text-xs">
            Tx. Venda: {ratioFormatter.format(convToSale)}%
          </span>
          <ArrowRight className="hidden text-zinc-300 xl:block dark:text-zinc-700" size={20} />
          <ArrowDown className="text-zinc-300 xl:hidden dark:text-zinc-700" size={20} />
        </div>

        {/* Vendas */}
        <div className="flex w-full flex-1 flex-col items-center rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/30">
          <span className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-500">Vendas</span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
            {numberFormatter.format(item.clients)}
          </span>
          <span className="mt-2 text-[10px] font-semibold text-emerald-600/70 dark:text-emerald-500/70">
            CPA: {currencyFormatter.format(cpa)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DailyAdsScreen() {
  const [records, setRecords] = useState<DailyAdsRecord[]>([]);
  const [sales, setSales] = useState<VendaLg[]>([]);
  const [tracking, setTracking] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [date, setDate] = useState("");
  const [spend, setSpend] = useState("");
  const [cpc, setCpc] = useState("");
  const [impressions, setImpressions] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DailyAdsRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [dateFilter, setDateFilter] = useState<"this_month" | "all">("this_month");
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const salesMetricsByDate = useMemo(() => {
    const metrics = new Map<
      string,
      { clients: number; revenue: number; commission: number }
    >();

    for (const sale of sales) {
      if (!sale.dataVenda) continue;
      const saleDate = new Date(sale.dataVenda);
      if (Number.isNaN(saleDate.getTime())) continue;

      const dateKey = campoGrandeDateFormatter.format(saleDate);
      const current = metrics.get(dateKey) ?? {
        clients: 0,
        revenue: 0,
        commission: 0,
      };
      const revenue = Array.isArray(sale.linhas)
        ? sale.linhas.reduce(
            (total, line) =>
              total + Number(line.preco) * Number(line.quantidade),
            0,
          )
        : 0;

      current.clients += 1;
      current.revenue += revenue;
      current.commission += Number(sale.comissao) || 0;
      metrics.set(dateKey, current);
    }

    return metrics;
  }, [sales]);

  const salesByDate = useMemo(() => {
    const map = new Map<string, VendaLg[]>();
    for (const sale of sales) {
      if (!sale.dataVenda) continue;
      const saleDate = new Date(sale.dataVenda);
      if (Number.isNaN(saleDate.getTime())) continue;
      const dateKey = campoGrandeDateFormatter.format(saleDate);
      const current = map.get(dateKey) ?? [];
      current.push(sale);
      map.set(dateKey, current);
    }
    return map;
  }, [sales]);

  const trackingMetricsByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const event of tracking) {
      if (event.event !== "click" && event.event !== "call") continue;
      if (event.is_bot && !event.gclid && !event.fbclid && !event.msclkid) continue;
      
      const dateKey = campoGrandeDateFormatter.format(new Date(event.created_at));
      if (!map.has(dateKey)) map.set(dateKey, new Set());
      map.get(dateKey)!.add(event.visitor_id);
    }
    
    const result = new Map<string, number>();
    for (const [dateKey, visitors] of map.entries()) {
      result.set(dateKey, visitors.size);
    }
    return result;
  }, [tracking]);

  const filteredRecords = useMemo(() => {
    if (dateFilter === "all") return records;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return records.filter((record) => {
      const [day, month, year] = record.date.split("/").map(Number);
      return month - 1 === currentMonth && year === currentYear;
    });
  }, [records, dateFilter]);

  const displayRecords = useMemo<DailyAdsDisplayRecord[]>(
    () =>
      filteredRecords.map((record) => {
        const salesMetrics = salesMetricsByDate.get(record.date);
        const clients = salesMetrics?.clients ?? 0;
        const revenue = salesMetrics?.revenue ?? 0;
        const commission = salesMetrics?.commission ?? 0;

        return {
          ...record,
          clicks: calculateClicks(record.spend, record.cpc),
          revenue,
          result: commission - record.spend,
          commission,
          clients,
          cpa: clients > 0 ? record.spend / clients : 0,
          roas: record.spend > 0 ? commission / record.spend : 0,
          averageCommission: clients > 0 ? commission / clients : 0,
          conversations: trackingMetricsByDate.get(record.date) ?? 0,
        };
      }),
    [filteredRecords, salesMetricsByDate, trackingMetricsByDate],
  );

  const sortedRecords = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;

    return [...displayRecords].sort((first, second) => {
      const firstValue =
        sortKey === "date"
          ? dateToTimestamp(first.date)
          : first[sortKey];
      const secondValue =
        sortKey === "date"
          ? dateToTimestamp(second.date)
          : second[sortKey];

      return (firstValue - secondValue) * direction;
    });
  }, [displayRecords, sortDirection, sortKey]);

  const totals = useMemo(() => {
    let result = 0;
    let commission = 0;
    let spend = 0;
    let clicks = 0;
    let impressions = 0;
    let revenue = 0;
    let clients = 0;
    let conversations = 0;

    for (const record of displayRecords) {
      result += record.result;
      commission += record.commission;
      spend += record.spend;
      clicks += record.clicks;
      impressions += record.impressions;
      revenue += record.revenue;
      clients += record.clients;
      conversations += record.conversations;
    }

    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpa = clients > 0 ? spend / clients : 0;
    const roas = spend > 0 ? commission / spend : 0;
    const averageCommission = clients > 0 ? commission / clients : 0;

    return {
      result,
      commission,
      spend,
      cpc,
      clicks,
      impressions,
      revenue,
      cpa,
      roas,
      clients,
      averageCommission,
      conversations,
    };
  }, [displayRecords]);

  useEffect(() => {
    let active = true;

    async function loadRecords() {
      try {
        const [adsResponse, salesResponse, trackingResponse] = await Promise.all([
          fetch("/api/daily-ads"),
          fetch("/api/vendas-lg"),
          fetch("/api/tracking"),
        ]);
        if (!adsResponse.ok || !salesResponse.ok) {
          throw new Error("Failed to load daily ads metrics");
        }
        const [adsData, salesData, trackingData] = (await Promise.all([
          adsResponse.json(),
          salesResponse.json(),
          trackingResponse.ok ? trackingResponse.json() : Promise.resolve([]),
        ])) as [DailyAdsRecord[], VendaLg[], TrackingEvent[]];
        if (active) {
          setRecords(adsData);
          setSales(salesData);
          setTracking(trackingData);
        }
      } catch {
        if (active) setLoadError("Não foi possível carregar os registros.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRecords();
    return () => {
      active = false;
    };
  }, []);

  function closeForm() {
    setFormOpen(false);
    setError("");
    setEditingRecord(null);
  }

  function openCreateForm() {
    setEditingRecord(null);
    setDate("");
    setSpend("");
    setCpc("");
    setImpressions("");
    setError("");
    setFormOpen(true);
  }

  function openEditForm(record: DailyAdsRecord) {
    setEditingRecord(record);
    setDate(record.date);
    setSpend(String(record.spend).replace(".", ","));
    setCpc(String(record.cpc).replace(".", ","));
    setImpressions(String(record.impressions));
    setError("");
    setFormOpen(true);
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  async function handleDelete(record: DailyAdsRecord) {
    const confirmed = window.confirm(
      `Excluir o registro de ${record.date}? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    setDeletingId(record.id);
    setActionError("");

    try {
      const response = await fetch(`/api/daily-ads/${record.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setActionError(data?.error ?? "Não foi possível excluir o registro.");
        return;
      }

      setRecords((current) => current.filter((item) => item.id !== record.id));
    } catch {
      setActionError("Não foi possível conectar ao servidor.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedSpend = parseDecimal(spend);
    const parsedCpc = parseDecimal(cpc);
    const parsedImpressions = Number(impressions);

    if (!isValidBrazilianDate(date)) {
      setError("Informe uma data válida no formato DD/MM/AAAA.");
      return;
    }

    if (
      !Number.isFinite(parsedSpend) ||
      parsedSpend < 0 ||
      !Number.isFinite(parsedCpc) ||
      parsedCpc < 0 ||
      !Number.isInteger(parsedImpressions) ||
      parsedImpressions < 0
    ) {
      setError("Preencha gasto, CPC e impressões com valores válidos.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const endpoint = editingRecord
        ? `/api/daily-ads/${editingRecord.id}`
        : "/api/daily-ads";
      const response = await fetch(endpoint, {
        method: editingRecord ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          spend: parsedSpend,
          cpc: parsedCpc,
          impressions: parsedImpressions,
        }),
      });
      const data = (await response.json()) as DailyAdsRecord | { error?: string };

      if (!response.ok) {
        setError("error" in data && data.error ? data.error : "Não foi possível salvar o registro.");
        return;
      }

      const savedRecord = data as DailyAdsRecord;
      setRecords((current) =>
        editingRecord
          ? current.map((item) =>
              item.id === savedRecord.id ? savedRecord : item,
            )
          : [savedRecord, ...current],
      );
      setDate("");
      setSpend("");
      setCpc("");
      setImpressions("");
      closeForm();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1500px]">
      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_20px_60px_-36px_rgba(24,24,27,0.4)] dark:border-zinc-800 dark:bg-zinc-950">
        <header className="flex flex-col gap-5 border-b border-zinc-200 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_45%)] p-6 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
              Google Ads
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Gastos diários
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Registre manualmente o desempenho de cada dia.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as "this_month" | "all")}
              className="min-h-11 cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-white px-4 pr-10 text-sm font-semibold text-zinc-700 outline-none transition hover:bg-zinc-50 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='currentColor' class='size-6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9' /%3E%3C/svg%3E")`,
                backgroundPosition: "right 10px center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "16px",
              }}
            >
              <option value="this_month">Esse mês</option>
              <option value="all">Todo o período</option>
            </select>
            
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <Plus aria-hidden="true" size={18} strokeWidth={2.5} />
              Adicionar registro
            </button>
          </div>
        </header>

        <div className="overflow-x-auto p-3 sm:p-5">
          <div className="min-w-[1400px]">
            <div className="grid grid-cols-[1.2fr_1.1fr_1fr_1fr_1fr_1fr_1fr_1.2fr_1fr_1fr_1fr_1.2fr_96px] divide-x divide-zinc-200 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:divide-zinc-800">
              <SortButton label="Data" sortKey="date" activeKey={sortKey} direction={sortDirection} align="left" onSort={handleSort} />
              <SortButton label="Resultado" sortKey="result" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortButton label="Comissão" sortKey="commission" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortButton label="Gasto" sortKey="spend" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortButton label="CPC" sortKey="cpc" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortButton label="Cliques" sortKey="clicks" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortButton label="Impressões" sortKey="impressions" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortButton label="Faturamento" sortKey="revenue" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortButton label="CPA" sortKey="cpa" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortButton label="ROAS" sortKey="roas" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortButton label="Clientes" sortKey="clients" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortButton label="Comissão média" sortKey="averageCommission" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <span className="self-center px-3 text-right">Ações</span>
            </div>

            {displayRecords.length > 0 && (
              <div className="mb-3 mt-1 grid grid-cols-[1.2fr_1.1fr_1fr_1fr_1fr_1fr_1fr_1.2fr_1fr_1fr_1fr_1.2fr_96px] items-center divide-x divide-blue-200/60 rounded-xl bg-blue-50 py-3 text-blue-900 shadow-sm dark:divide-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
                <span className="px-3 text-sm font-bold uppercase tracking-wider">
                  Total
                </span>
                <span
                  className={`px-3 text-right text-sm font-bold tabular-nums ${
                    totals.result > 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : totals.result < 0
                        ? "text-red-700 dark:text-red-400"
                        : ""
                  }`}
                >
                  {currencyFormatter.format(totals.result)}
                </span>
                <span className="px-3 text-right text-sm font-bold tabular-nums">
                  {currencyFormatter.format(totals.commission)}
                </span>
                <span className="px-3 text-right text-sm font-bold tabular-nums">
                  {currencyFormatter.format(totals.spend)}
                </span>
                <span className="px-3 text-right text-sm font-medium tabular-nums opacity-90">
                  {currencyFormatter.format(totals.cpc)}
                </span>
                <span className="px-3 text-right text-sm font-medium tabular-nums opacity-90">
                  {numberFormatter.format(totals.clicks)}
                </span>
                <span className="px-3 text-right text-sm font-medium tabular-nums opacity-90">
                  {numberFormatter.format(totals.impressions)}
                </span>
                <span className="px-3 text-right text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {currencyFormatter.format(totals.revenue)}
                </span>
                <span className="px-3 text-right text-sm font-medium tabular-nums opacity-90">
                  {totals.clients > 0 ? currencyFormatter.format(totals.cpa) : "—"}
                </span>
                <span className="px-3 text-right text-sm font-bold tabular-nums">
                  {totals.spend > 0 ? `${ratioFormatter.format(totals.roas)}x` : "—"}
                </span>
                <span className="px-3 text-right text-sm font-bold tabular-nums">
                  {numberFormatter.format(totals.clients)}
                </span>
                <span className="px-3 text-right text-sm font-medium tabular-nums opacity-90">
                  {totals.clients > 0 ? currencyFormatter.format(totals.averageCommission) : "—"}
                </span>
                <span className="px-3 text-right text-sm font-medium opacity-50">
                  —
                </span>
              </div>
            )}

            {actionError ? (
              <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/30 dark:text-red-400">
                {actionError}
              </p>
            ) : null}

            {loading ? (
              <p className="py-12 text-center text-sm text-zinc-500">Carregando registros...</p>
            ) : loadError ? (
              <p className="py-12 text-center text-sm font-medium text-red-600 dark:text-red-400">{loadError}</p>
            ) : records.length === 0 ? (
              <p className="py-12 text-center text-sm text-zinc-500">Nenhum registro adicionado ainda.</p>
            ) : (
              <ul className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {sortedRecords.map((item) => {
                  const isExpanded = expandedRecordId === item.id;
                  const daySales = salesByDate.get(item.date) ?? [];

                  return (
                    <li
                      key={item.id}
                      className="flex flex-col even:bg-zinc-50/60 dark:even:bg-zinc-900/40"
                    >
                      <div
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          setExpandedRecordId(isExpanded ? null : item.id);
                        }}
                        className={`grid grid-cols-[1.2fr_1.1fr_1fr_1fr_1fr_1fr_1fr_1.2fr_1fr_1fr_1fr_1.2fr_96px] items-center divide-x divide-zinc-200 py-2.5 transition-colors cursor-pointer hover:bg-blue-50/50 dark:divide-zinc-800 dark:hover:bg-blue-900/20 ${
                          isExpanded ? "bg-blue-50/50 dark:bg-blue-900/20" : ""
                        }`}
                      >
                        <span className="px-3 text-sm font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                          <ArrowDown 
                            size={14} 
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-600' : 'text-zinc-400'}`} 
                          />
                          {item.date}
                        </span>
                    <span
                      className={`px-3 text-right text-sm font-semibold tabular-nums ${
                        item.result > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : item.result < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      {currencyFormatter.format(item.result)}
                    </span>
                    <span className="px-3 text-right text-sm font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                      {currencyFormatter.format(item.commission)}
                    </span>
                    <span className="px-3 text-right text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                      {currencyFormatter.format(item.spend)}
                    </span>
                    <span className="px-3 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                      {currencyFormatter.format(item.cpc)}
                    </span>
                    <span className="px-3 text-right text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                      {numberFormatter.format(item.clicks)}
                    </span>
                    <span className="px-3 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                      {numberFormatter.format(item.impressions)}
                    </span>
                    <span className="px-3 text-right text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {currencyFormatter.format(item.revenue)}
                    </span>
                    <span className="px-3 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                      {item.clients > 0 ? currencyFormatter.format(item.cpa) : "—"}
                    </span>
                    <span className="px-3 text-right text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                      {item.spend > 0 ? `${ratioFormatter.format(item.roas)}x` : "—"}
                    </span>
                    <span className="px-3 text-right text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                      {numberFormatter.format(item.clients)}
                    </span>
                    <span className="px-3 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                      {item.clients > 0
                        ? currencyFormatter.format(item.averageCommission)
                        : "—"}
                    </span>
                      <div className="flex justify-end gap-1 px-3">
                        <button
                          type="button"
                          onClick={() => openEditForm(item)}
                          className="grid size-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                          aria-label={`Editar registro de ${item.date}`}
                        >
                          <Pencil aria-hidden="true" size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          className="grid size-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-600 disabled:cursor-wait disabled:opacity-50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          aria-label={`Excluir registro de ${item.date}`}
                        >
                          <Trash2 aria-hidden="true" size={16} />
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="border-t border-zinc-200 px-6 py-6 dark:border-zinc-800/80">
                        <FunnelView item={item} />

                        {daySales.length === 0 ? (
                          <p className="text-sm text-zinc-500">Nenhuma venda registrada neste dia.</p>
                        ) : (
                          <div className="space-y-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                              Lista de Vendas ({daySales.length})
                            </h4>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              {daySales.map((sale) => (
                                <div key={sale.id} className="rounded-xl border border-zinc-200 bg-white/50 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
                                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100" title={sale.clienteNome}>
                                    {sale.clienteNome}
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                    {currencyFormatter.format(
                                      sale.linhas.reduce((acc, l) => acc + l.preco * l.quantidade, 0)
                                    )}
                                  </p>
                                  {sale.comissao ? (
                                    <p className="mt-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                                      Comissão: {currencyFormatter.format(sale.comissao)}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/50 p-4 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={closeForm}
            aria-label="Fechar formulário"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-ads-form-title"
            className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 id="daily-ads-form-title" className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                  {editingRecord ? "Editar registro" : "Novo registro"}
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {editingRecord
                    ? "Atualize os números deste dia."
                    : "Informe os números exibidos no Google Ads."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="grid size-10 place-items-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                aria-label="Fechar"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Data
                <input
                  type="text"
                  inputMode="numeric"
                  value={date}
                  onChange={(event) => setDate(maskDate(event.target.value))}
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Gasto (R$)
                  <input
                    type="text"
                    inputMode="decimal"
                    value={spend}
                    onChange={(event) => setSpend(event.target.value)}
                    placeholder="0,00"
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </label>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  CPC (R$)
                  <input
                    type="text"
                    inputMode="decimal"
                    value={cpc}
                    onChange={(event) => setCpc(event.target.value)}
                    placeholder="0,00"
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Impressões
                <input
                  type="text"
                  inputMode="numeric"
                  value={impressions}
                  onChange={(event) => setImpressions(event.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </label>

              {error ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  className="min-h-11 rounded-xl px-4 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-65"
                >
                  {submitting
                    ? "Salvando..."
                    : editingRecord
                      ? "Salvar alterações"
                      : "Salvar registro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
