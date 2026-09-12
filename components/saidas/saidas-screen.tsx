"use client";

import {
  CATEGORIAS_PADRAO,
  FORMAS_PAGAMENTO,
  getCategoriaInfo,
  type Saida,
  type SaidaCategoria,
} from "@/lib/saida";
import { formatBRL, parseMoney } from "@/lib/money";
import {
  Calendar,
  Check,
  ChevronDown,
  CreditCard,
  Edit2,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type DateFilterType = "today" | "yesterday" | "7d" | "month" | "30d" | "all";

export function SaidasScreen() {
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filtros
  const [dateFilter, setDateFilter] = useState<DateFilterType>("month");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [searchDesc, setSearchDesc] = useState("");

  // Formulário de Registro Rápido
  const [valorInput, setValorInput] = useState("");
  const [categoriaInput, setCategoriaInput] = useState<string>("Ferramentas");
  const [descricaoInput, setDescricaoInput] = useState("");
  const [formaPagamentoInput, setFormaPagamentoInput] = useState<string>("Pix");
  const [dataSaidaInput, setDataSaidaInput] = useState<string>(() => {
    const now = new Date();
    // YYYY-MM-DDTHH:mm
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });

  // Modal de Edição
  const [editingSaida, setEditingSaida] = useState<Saida | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Carregar dados
  const fetchSaidas = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/saidas");
      if (res.ok) {
        const data = await res.json();
        setSaidas(
          data.map((item: any) => ({
            ...item,
            valor: typeof item.valor === "string" ? parseFloat(item.valor) : item.valor,
          }))
        );
      }
    } catch (err) {
      console.error("Erro ao carregar saídas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaidas();
  }, []);

  // Submit de Nova Saída
  const handleCreateSaida = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValor = parseMoney(valorInput);
    if (!parsedValor || parsedValor <= 0) {
      alert("Por favor, digite um valor válido maior que R$ 0,00.");
      return;
    }
    if (!categoriaInput) {
      alert("Selecione uma categoria.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/saidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor: parsedValor,
          categoria: categoriaInput,
          descricao: descricaoInput,
          formaPagamento: formaPagamentoInput,
          dataSaida: new Date(dataSaidaInput).toISOString(),
        }),
      });

      if (res.ok) {
        const nova = await res.json();
        setSaidas((prev) => [
          {
            ...nova,
            valor: typeof nova.valor === "string" ? parseFloat(nova.valor) : nova.valor,
          },
          ...prev,
        ]);
        // Reset do formulário preservando a data atual
        setValorInput("");
        setDescricaoInput("");
      } else {
        const err = await res.json();
        alert(`Erro ao registrar saída: ${err.error || "Tente novamente."}`);
      }
    } catch (err) {
      console.error("Erro ao salvar saída:", err);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  // Excluir Saída
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta saída?")) return;
    try {
      const res = await fetch(`/api/saidas/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSaidas((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error("Erro ao excluir saída:", err);
    }
  };

  // Salvar Edição
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSaida) return;

    const parsedValor =
      typeof editingSaida.valor === "string"
        ? parseMoney(editingSaida.valor as unknown as string)
        : editingSaida.valor;

    if (!parsedValor || parsedValor <= 0) {
      alert("Digite um valor válido.");
      return;
    }

    try {
      const res = await fetch(`/api/saidas/${editingSaida.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor: parsedValor,
          categoria: editingSaida.categoria,
          descricao: editingSaida.descricao,
          formaPagamento: editingSaida.formaPagamento,
          dataSaida: new Date(editingSaida.dataSaida).toISOString(),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSaidas((prev) =>
          prev.map((s) =>
            s.id === updated.id
              ? {
                  ...updated,
                  valor: typeof updated.valor === "string" ? parseFloat(updated.valor) : updated.valor,
                }
              : s
          )
        );
        setEditingSaida(null);
      }
    } catch (err) {
      console.error("Erro ao atualizar saída:", err);
    }
  };

  // Filtragem dos dados
  const filteredSaidas = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let cutoffDate: Date | null = null;
    let isYesterday = false;
    let endOfYesterday: Date | null = null;

    if (dateFilter === "today") {
      cutoffDate = startOfToday;
    } else if (dateFilter === "yesterday") {
      isYesterday = true;
      cutoffDate = new Date(startOfToday);
      cutoffDate.setDate(cutoffDate.getDate() - 1);
      endOfYesterday = new Date(cutoffDate);
      endOfYesterday.setDate(endOfYesterday.getDate() + 1);
    } else if (dateFilter === "month") {
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (dateFilter === "7d") {
      cutoffDate = new Date(startOfToday);
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (dateFilter === "30d") {
      cutoffDate = new Date(startOfToday);
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    }

    return saidas.filter((s) => {
      // Filtro de data
      if (cutoffDate) {
        const sDate = new Date(s.dataSaida);
        if (isYesterday && endOfYesterday) {
          if (sDate < cutoffDate || sDate >= endOfYesterday) return false;
        } else {
          if (sDate < cutoffDate) return false;
        }
      }

      // Filtro de categoria
      if (selectedCategoryFilter !== "all" && s.categoria !== selectedCategoryFilter) {
        return false;
      }

      // Filtro de busca na descrição
      if (searchDesc.trim()) {
        const q = searchDesc.toLowerCase();
        const descMatch = (s.descricao || "").toLowerCase().includes(q);
        const catMatch = s.categoria.toLowerCase().includes(q);
        if (!descMatch && !catMatch) return false;
      }

      return true;
    });
  }, [saidas, dateFilter, selectedCategoryFilter, searchDesc]);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const total = filteredSaidas.reduce((acc, s) => acc + (s.valor || 0), 0);
    const count = filteredSaidas.length;
    const media = count > 0 ? total / count : 0;

    // Agrupamento por categoria
    const categoryTotals: Record<string, number> = {};
    filteredSaidas.forEach((s) => {
      categoryTotals[s.categoria] = (categoryTotals[s.categoria] || 0) + (s.valor || 0);
    });

    let topCategory = "Nenhuma";
    let topCategoryVal = 0;
    Object.entries(categoryTotals).forEach(([cat, val]) => {
      if (val > topCategoryVal) {
        topCategoryVal = val;
        topCategory = cat;
      }
    });

    return { total, count, media, topCategory, topCategoryVal, categoryTotals };
  }, [filteredSaidas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <TrendingDown className="h-5 w-5" />
            </span>
            Saídas e Despesas
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Registro rápido e controle de custos operacionais do Chaveiro 24h
          </p>
        </div>
        <button
          onClick={fetchSaidas}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Card de Registro Rápido (1-Click UX) */}
      <div className="rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50/50 via-white to-orange-50/30 p-5 shadow-sm dark:border-rose-950/60 dark:from-rose-950/20 dark:via-zinc-900 dark:to-orange-950/10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white text-xs font-bold shadow">
              +
            </span>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Lançamento Rápido de Saída
            </h2>
          </div>
          <span className="text-xs font-medium text-zinc-400">
            Preencha em segundos
          </span>
        </div>

        <form onSubmit={handleCreateSaida} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            {/* Valor */}
            <div className="md:col-span-4">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Valor (R$) <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-sm">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 font-bold text-zinc-400">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valorInput}
                  onChange={(e) => setValorInput(e.target.value)}
                  className="block w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-xl font-black tracking-tight text-zinc-900 placeholder-zinc-300 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-600"
                  required
                />
              </div>
            </div>

            {/* Descrição Opcional */}
            <div className="md:col-span-5">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Descrição <span className="text-zinc-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ex.: Chave canivete Fiat, Gasolina moto, Almoço..."
                value={descricaoInput}
                onChange={(e) => setDescricaoInput(e.target.value)}
                className="block w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-600"
              />
            </div>

            {/* Forma de Pagamento */}
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Pagamento
              </label>
              <select
                value={formaPagamentoInput}
                onChange={(e) => setFormaPagamentoInput(e.target.value)}
                className="block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-800 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Categorias em Chips Rápidos (1 Toque) */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Categoria: <span className="text-zinc-900 dark:text-white font-black">{categoriaInput}</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS_PADRAO.map((cat) => {
                const isSelected = categoriaInput === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoriaInput(cat.id)}
                    className={`group inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                      isSelected
                        ? "scale-105 bg-zinc-900 text-white shadow-md shadow-zinc-900/20 ring-2 ring-zinc-900 ring-offset-2 dark:bg-white dark:text-zinc-900 dark:ring-white dark:ring-offset-zinc-900"
                        : "border border-zinc-200/80 bg-white/80 text-zinc-700 hover:border-zinc-300 hover:bg-white active:scale-95 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span>{cat.icone}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botão de Gravação */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Data/Hora:</span>
              <input
                type="datetime-local"
                value={dataSaidaInput}
                onChange={(e) => setDataSaidaInput(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-600/25 transition-all hover:from-rose-500 hover:to-red-500 hover:shadow-rose-600/35 active:scale-95 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {submitting ? "Gravando..." : "Registrar Saída"}
            </button>
          </div>
        </form>
      </div>

      {/* KPIs & Métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Total de Saídas
          </p>
          <p className="mt-1 text-2xl font-black text-rose-700 dark:text-rose-300">
            {formatBRL(stats.total)}
          </p>
          <p className="mt-1 text-xs text-rose-500/80">
            {stats.count} registro{stats.count !== 1 ? "s" : ""} no período
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Média por Saída
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
            {formatBRL(stats.media)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">ticket médio de custo</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Maior Categoria
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-lg">
              {getCategoriaInfo(stats.topCategory).icone}
            </span>
            <p className="text-xl font-bold text-zinc-900 dark:text-white truncate">
              {stats.topCategory}
            </p>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {stats.topCategoryVal > 0 ? formatBRL(stats.topCategoryVal) : "Sem dados"}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Período Ativo
          </p>
          <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white capitalize">
            {dateFilter === "today"
              ? "Hoje"
              : dateFilter === "yesterday"
              ? "Ontem"
              : dateFilter === "7d"
              ? "Últimos 7 dias"
              : dateFilter === "month"
              ? "Este Mês"
              : dateFilter === "30d"
              ? "Últimos 30 dias"
              : "Todo o histórico"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">filtro selecionado</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Botões de Período */}
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["today", "Hoje"],
                ["yesterday", "Ontem"],
                ["7d", "7 dias"],
                ["month", "Este Mês"],
                ["30d", "30 dias"],
                ["all", "Todas"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setDateFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  dateFilter === value
                    ? "bg-rose-600 text-white shadow dark:bg-rose-500"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Filtro por Categoria */}
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-zinc-400" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <option value="all">Todas as Categorias</option>
              {CATEGORIAS_PADRAO.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icone} {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Busca por texto */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por descrição ou categoria..."
            value={searchDesc}
            onChange={(e) => setSearchDesc(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 py-1.5 pl-9 pr-3 text-xs text-zinc-900 placeholder-zinc-400 focus:border-rose-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* Lista de Saídas */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Registros Encontrados ({filteredSaidas.length})
          </h3>
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
            Total: -{formatBRL(stats.total)}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            Carregando saídas...
          </div>
        ) : filteredSaidas.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Nenhuma saída encontrada para os filtros selecionados.
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Registre novos gastos no card acima para acompanhar suas finanças.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredSaidas.map((s) => {
              const catInfo = getCategoriaInfo(s.categoria);
              const dataFormatada = new Date(s.dataSaida).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={s.id}
                  className="flex flex-col gap-2 p-4 transition hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${catInfo.bg} ${catInfo.border} border`}>
                      {catInfo.icone}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${catInfo.bg} ${catInfo.text}`}
                        >
                          {catInfo.label}
                        </span>
                        {s.formaPagamento && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            <CreditCard className="h-3 w-3" />
                            {s.formaPagamento}
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-400">
                          {dataFormatada}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {s.descricao ? s.descricao : <span className="text-zinc-400 italic">Sem descrição</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="text-base font-black text-rose-600 dark:text-rose-400">
                      - {formatBRL(s.valor)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingSaida(s)}
                        title="Editar"
                        className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        title="Excluir"
                        className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {editingSaida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Editar Saída
              </h3>
              <button
                onClick={() => setEditingSaida(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                  Valor (R$)
                </label>
                <input
                  type="text"
                  value={editingSaida.valor}
                  onChange={(e) =>
                    setEditingSaida({
                      ...editingSaida,
                      valor: e.target.value as unknown as number,
                    })
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-lg font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                  Categoria
                </label>
                <select
                  value={editingSaida.categoria}
                  onChange={(e) =>
                    setEditingSaida({ ...editingSaida, categoria: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                >
                  {CATEGORIAS_PADRAO.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icone} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                  Descrição
                </label>
                <input
                  type="text"
                  value={editingSaida.descricao || ""}
                  onChange={(e) =>
                    setEditingSaida({ ...editingSaida, descricao: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                  Forma de Pagamento
                </label>
                <select
                  value={editingSaida.formaPagamento || "Pix"}
                  onChange={(e) =>
                    setEditingSaida({
                      ...editingSaida,
                      formaPagamento: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                >
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                  Data e Hora
                </label>
                <input
                  type="datetime-local"
                  value={
                    editingSaida.dataSaida
                      ? new Date(
                          new Date(editingSaida.dataSaida).getTime() -
                            new Date().getTimezoneOffset() * 60000
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setEditingSaida({
                      ...editingSaida,
                      dataSaida: new Date(e.target.value).toISOString(),
                    })
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingSaida(null)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-rose-500"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
