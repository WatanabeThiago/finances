"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import type { Partner } from "@/lib/partner";
import { parsePartnersJson } from "@/lib/partner";
import type { VendaLg } from "@/lib/venda-lg";
import { parseVendasLgJson } from "@/lib/venda-lg";
import type { Service } from "@/lib/service";
import { formatBRL } from "@/lib/money";
import { VendaDetalheModal } from "@/components/vendas-lg/venda-detalhe-modal";
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Briefcase,
  CheckCircle2,
  Clock,
  MapPin,
  Compass,
  FileText,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";

interface ParceiroDashboardScreenProps {
  id: string;
}

function getSaleTotal(v: VendaLg): number {
  return v.linhas.reduce((acc, l) => acc + l.preco * l.quantidade, 0);
}

function formatDateBr(dateString?: string): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

function PartnerAvatar({
  partner,
  size = "md",
}: {
  partner: Partner;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-16 w-16" : "h-12 w-12";
  const textClass = size === "lg" ? "text-2xl font-bold" : "text-base font-semibold";
  return (
    <div
      className={`relative ${dim} shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 shadow-sm`}
    >
      {partner.fotoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={partner.fotoDataUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className={`flex h-full w-full items-center justify-center text-zinc-500 dark:text-zinc-400 ${textClass}`}>
          {partner.nome.trim().charAt(0).toUpperCase() || "?"}
        </div>
      )}
    </div>
  );
}

function SegmentBadges({ partner }: { partner: Partner }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {partner.automotivo && (
        <span className="inline-flex items-center rounded-lg bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-400/20">
          Automotivo
        </span>
      )}
      {partner.residencial && (
        <span className="inline-flex items-center rounded-lg bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-600/20 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-400/20">
          Residencial
        </span>
      )}
      {!partner.automotivo && !partner.residencial && (
        <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
      )}
    </div>
  );
}

export function ParceiroDashboardScreen({ id }: ParceiroDashboardScreenProps) {
  const router = useRouter();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [vendas, setVendas] = useState<VendaLg[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVenda, setSelectedVenda] = useState<VendaLg | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [partnerRes, vendasRes, servicosRes] = await Promise.all([
          fetch(`/api/parceiros/${id}`),
          fetch("/api/vendas-lg"),
          fetch("/api/servicos"),
        ]);

        if (!partnerRes.ok) {
          if (partnerRes.status === 404) {
            throw new Error("Parceiro não encontrado");
          }
          throw new Error("Falha ao carregar parceiro");
        }
        const partnerData = await partnerRes.json();
        setPartner(partnerData);

        if (servicosRes.ok) {
          const svcData = await servicosRes.json();
          setServices(svcData);
        }

        if (vendasRes.ok) {
          const vendasData = await vendasRes.json();
          const normalizedVendas = vendasData.map((v: any) => ({
            ...v,
            comissao: typeof v.comissao === "string" ? parseFloat(v.comissao) : v.comissao,
            linhas: Array.isArray(v.linhas) ? v.linhas.map((l: any) => ({
              ...l,
              precoOriginal: typeof l.precoOriginal === "string" ? parseFloat(l.precoOriginal) : l.precoOriginal,
              preco: typeof l.preco === "string" ? parseFloat(l.preco) : l.preco,
              quantidade: typeof l.quantidade === "string" ? parseInt(l.quantidade, 10) : l.quantidade,
            })) : [],
          }));
          setVendas(normalizedVendas);
        }
        setError(null);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar dados");
        
        // LocalStorage Fallbacks
        const localPartners = localStorage.getItem("finances.parceiros.v1");
        if (localPartners) {
          const partnersList = parsePartnersJson(localPartners);
          const found = partnersList.find((p) => p.id === id);
          if (found) {
            setPartner(found);
            setError(null);
          }
        }
        const localVendas = localStorage.getItem("finances.vendas-lg.v1");
        if (localVendas) {
          setVendas(parseVendasLgJson(localVendas));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Statistics calculations
  const stats = useMemo(() => {
    const partnerSales = vendas.filter((v) => v.prestadorId === id);
    const totalSalesCount = partnerSales.length;

    const faturamentoTotal = partnerSales.reduce((acc, v) => {
      const saleVal = getSaleTotal(v);
      return acc + (saleVal - (v.comissao || 0));
    }, 0);

    const comissaoPaga = partnerSales
      .filter((v) => v.comissaoPaga && v.comissao)
      .reduce((acc, v) => acc + (v.comissao || 0), 0);

    const comissaoTotal = partnerSales.reduce((acc, v) => acc + (v.comissao || 0), 0);
    const comissaoNaoPaga = comissaoTotal - comissaoPaga;

    const ticketMedio = totalSalesCount > 0 ? faturamentoTotal / totalSalesCount : 0;

    return {
      totalSalesCount,
      faturamentoTotal,
      comissaoPaga,
      comissaoNaoPaga,
      ticketMedio,
    };
  }, [vendas, id]);

  // Chart Daily Revenue formatting
  const chartData = useMemo(() => {
    const partnerSales = vendas
      .filter((v) => v.prestadorId === id && v.dataVenda)
      .sort((a, b) => new Date(a.dataVenda!).getTime() - new Date(b.dataVenda!).getTime());

    if (partnerSales.length === 0) return [];

    const startDate = new Date(partnerSales[0].dataVenda!);
    const lastSaleDate = new Date(partnerSales[partnerSales.length - 1].dataVenda!);
    const endDate = new Date(Math.max(lastSaleDate.getTime(), new Date().getTime()));

    const salesMap = new Map<string, { faturamento: number; comissao: number }>();
    partnerSales.forEach((v) => {
      const d = new Date(v.dataVenda!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const saleTotal = getSaleTotal(v);
      const partnerShare = saleTotal - (v.comissao || 0);
      const com = v.comissao || 0;

      const existing = salesMap.get(key) || { faturamento: 0, comissao: 0 };
      salesMap.set(key, {
        faturamento: existing.faturamento + partnerShare,
        comissao: existing.comissao + com,
      });
    });

    const list = [];
    const current = new Date(startDate.getTime());
    const safetyLimit = 365;
    let daysCount = 0;

    while (current <= endDate && daysCount < safetyLimit) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      const label = current.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const val = salesMap.get(key) || { faturamento: 0, comissao: 0 };

      list.push({
        label,
        faturamento: val.faturamento,
        comissao: val.comissao,
        ts: current.getTime(),
      });

      current.setDate(current.getDate() + 1);
      daysCount++;
    }

    return list;
  }, [vendas, id]);

  const partnerSalesSorted = useMemo(() => {
    return vendas
      .filter((v) => v.prestadorId === id)
      .sort((a, b) => {
        const dateA = a.dataVenda ? new Date(a.dataVenda).getTime() : 0;
        const dateB = b.dataVenda ? new Date(b.dataVenda).getTime() : 0;
        return dateB - dateA;
      });
  }, [vendas, id]);

  const commissionPieData = useMemo(() => {
    return [
      { name: "Paga", value: stats.comissaoPaga, color: "#10b981" },
      { name: "Pendente", value: stats.comissaoNaoPaga, color: "#f59e0b" },
    ].filter((item) => item.value > 0);
  }, [stats]);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Carregando dados do parceiro...</p>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-28">
        <Link href="/parceiros" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" /> Voltar para Parceiros
        </Link>
        <div className="rounded-2xl border border-dashed border-red-300 bg-red-50/80 px-4 py-8 text-center dark:border-red-700/50 dark:bg-red-950/20">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            ⚠️ {error || "Parceiro não encontrado"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-28">
      {/* Back button */}
      <div>
        <Link href="/parceiros" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-sm font-semibold transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar para Parceiros
        </Link>
      </div>

      {/* Profile summary card */}
      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <PartnerAvatar partner={partner} size="lg" />
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">
              {partner.nome}
            </h2>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 text-sm text-zinc-500 dark:text-zinc-400">
              {partner.endereco && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                  {partner.endereco}
                </span>
              )}
              {partner.latitude && partner.longitude && (
                <span className="inline-flex items-center gap-1 font-mono text-xs text-zinc-400">
                  <Compass className="h-3.5 w-3.5 text-zinc-400" />
                  {Number(partner.latitude).toFixed(4)}, {Number(partner.longitude).toFixed(4)}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <SegmentBadges partner={partner} />
              {partner.telefone && (
                <a
                  href={`https://wa.me/${(partner.telefone as string).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-400/20 dark:hover:bg-emerald-950/80"
                  title="Abrir no WhatsApp"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Faturamento
            </span>
            <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg font-bold text-zinc-900 dark:text-white sm:text-xl">
            {formatBRL(stats.faturamentoTotal)}
          </p>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Líquido acumulado</span>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Comissões Pagas
            </span>
            <div className="rounded-lg bg-sky-50 p-1.5 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg font-bold text-zinc-900 dark:text-white sm:text-xl">
            {formatBRL(stats.comissaoPaga)}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Repassado</span>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Pendente
            </span>
            <div className="rounded-lg bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg font-bold text-zinc-900 dark:text-white sm:text-xl">
            {formatBRL(stats.comissaoNaoPaga)}
          </p>
          <span className="text-[10px] text-amber-500 dark:text-amber-400 font-semibold">A receber</span>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Vendas
            </span>
            <div className="rounded-lg bg-zinc-100 p-1.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg font-bold text-zinc-900 dark:text-white sm:text-xl">
            {stats.totalSalesCount}
          </p>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Serviços executados</span>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Ticket Médio
            </span>
            <div className="rounded-lg bg-violet-50 p-1.5 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg font-bold text-zinc-900 dark:text-white sm:text-xl">
            {formatBRL(stats.ticketMedio)}
          </p>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Líquido por serviço</span>
        </div>
      </section>

      {/* Map Card — only shown when partner has coordinates */}
      {partner.latitude && partner.longitude && (
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Localização</h3>
            <a
              href={`https://www.google.com/maps?q=${partner.latitude},${partner.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
            >
              Abrir no Google Maps ↗
            </a>
          </div>
          <div className="relative h-64 w-full">
            <iframe
              title={`Localização de ${partner.nome}`}
              className="h-full w-full border-0"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(partner.longitude) - 0.048}%2C${Number(partner.latitude) - 0.032}%2C${Number(partner.longitude) + 0.048}%2C${Number(partner.latitude) + 0.032}&layer=mapnik&marker=${partner.latitude}%2C${partner.longitude}`}
              scrolling="no"
            />
          </div>
        </section>
      )}

      {/* Charts Section */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Daily Evolution Chart */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Evolução do Faturamento (Últimos dias ativos)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" vertical={false} className="dark:stroke-zinc-800/80" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val: number) => val === 0 ? "0" : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val)}
                  width={38}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border border-zinc-200 bg-white p-2.5 text-xs shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                        <p className="mb-1 font-bold text-zinc-700 dark:text-zinc-200">{label}</p>
                        <p className="text-emerald-600 dark:text-emerald-400">
                          Faturamento: {formatBRL(Number(payload[0].value))}
                        </p>
                        {payload[1] && (
                          <p className="text-violet-600 dark:text-violet-400">
                            Comissão: {formatBRL(Number(payload[1].value))}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorFaturamento)" />
                <Bar dataKey="comissao" name="Comissão" fill="#8b5cf6" opacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-sm text-zinc-400">Nenhum histórico disponível.</div>
          )}
        </div>

        {/* Commissions breakdown Pie */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 flex flex-col justify-between">
          <div>
            <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Status das Comissões</h3>
            {commissionPieData.length > 0 ? (
              <div className="flex justify-center my-4">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={commissionPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {commissionPieData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatBRL(Number(value ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[150px] items-center justify-center text-sm text-zinc-400">Sem comissões cadastradas</div>
            )}
          </div>
          {commissionPieData.length > 0 && (
            <div className="space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Repassadas (Pagas)
                </span>
                <span className="font-semibold text-zinc-950 dark:text-zinc-50">{formatBRL(stats.comissaoPaga)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  A receber (Pendentes)
                </span>
                <span className="font-semibold text-zinc-950 dark:text-zinc-50">{formatBRL(stats.comissaoNaoPaga)}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Recent Sales List */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">Serviços e Vendas Vinculadas</h3>
        
        {partnerSalesSorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900/10">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Nenhum serviço realizado por este parceiro ainda.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Cliente</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Data</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Valor Bruto</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Comissão</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Líquido Parceiro</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Status Comissão</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {partnerSalesSorted.map((v, index) => {
                    const isEven = index % 2 === 0;
                    const totalVal = getSaleTotal(v);
                    const partnerShare = totalVal - (v.comissao || 0);
                    return (
                      <tr key={v.id} className={`transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70 ${isEven ? "bg-white dark:bg-zinc-950" : "bg-zinc-50 dark:bg-zinc-900/40"}`}>
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{v.clienteNome}</td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{formatDateBr(v.dataVenda)}</td>
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{formatBRL(totalVal)}</td>
                        <td className="px-4 py-3 text-violet-600 dark:text-violet-400">
                          {v.comissao ? formatBRL(v.comissao) : "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{formatBRL(partnerShare)}</td>
                        <td className="px-4 py-3">
                          {v.comissao ? (
                            v.comissaoPaga ? (
                              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300">
                                Paga
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300">
                                Pendente
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedVenda(v)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
                          >
                            Ver <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile List View */}
            <div className="grid grid-cols-1 gap-2.5 md:hidden">
              {partnerSalesSorted.map((v) => {
                const totalVal = getSaleTotal(v);
                const partnerShare = totalVal - (v.comissao || 0);
                return (
                  <div key={v.id} className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-zinc-900 dark:text-white">{v.clienteNome}</p>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatDateBr(v.dataVenda)}</span>
                    </div>
                    <div className="mt-2.5 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                      <div className="flex justify-between">
                        <span>Total do Serviço:</span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-300">{formatBRL(totalVal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Comissão Retida:</span>
                        <span className="font-medium text-violet-600 dark:text-violet-400">{v.comissao ? formatBRL(v.comissao) : "—"}</span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-100 pt-1.5 dark:border-zinc-800/80">
                        <span className="font-medium text-zinc-900 dark:text-zinc-200">Faturamento Líquido:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(partnerShare)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-zinc-100/60 pt-2.5 dark:border-zinc-800/60">
                      <div>
                        {v.comissao ? (
                          v.comissaoPaga ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Comissão Paga
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300">
                              Comissão Pendente
                            </span>
                          )
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedVenda(v)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
                      >
                        Ver detalhes <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Venda detail modal */}
      {partner && (
        <VendaDetalheModal
          venda={selectedVenda}
          servicoById={new Map(services.map((s) => [s.id, s]))}
          parceiros={partner ? [partner] : []}
          onClose={() => setSelectedVenda(null)}
        />
      )}
    </div>
  );
}
