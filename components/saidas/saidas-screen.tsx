"use client";

import {
  CATEGORIAS_PADRAO,
  FORMAS_PAGAMENTO,
  getCategoriaInfo,
  type ContaFixa,
  type Saida,
  type SaidaCategoria,
  type SaidaStatus,
} from "@/lib/saida";
import { formatBRL, parseMoney } from "@/lib/money";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Edit2,
  Filter,
  Plus,
  Receipt,
  RefreshCw,
  Repeat,
  Search,
  Tag,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import { SkeletonList } from "@/components/ui/skeleton";
import { useEffect, useMemo, useState } from "react";

type DateFilterType = "today" | "yesterday" | "7d" | "month" | "30d" | "all";
type TabType = "saidas" | "contas-a-pagar" | "contas-fixas";

export function SaidasScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("saidas");

  // Saídas
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [contasFixas, setContasFixas] = useState<ContaFixa[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filtros
  const [dateFilter, setDateFilter] = useState<DateFilterType>("month");
  const [statusFilter, setStatusFilter] = useState<"all" | "pago" | "pendente">("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [searchDesc, setSearchDesc] = useState("");

  // Formulário de Registro Rápido
  const [valorInput, setValorInput] = useState("");
  const [categoriaInput, setCategoriaInput] = useState<string>("Ferramentas");
  const [descricaoInput, setDescricaoInput] = useState("");
  const [formaPagamentoInput, setFormaPagamentoInput] = useState<string>("Pix");
  const [statusInput, setStatusInput] = useState<SaidaStatus>("pago");
  const [fornecedorInput, setFornecedorInput] = useState("");
  const [dataVencimentoInput, setDataVencimentoInput] = useState<string>("");
  const [dataSaidaInput, setDataSaidaInput] = useState<string>(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });

  // Modal de Edição de Saída
  const [editingSaida, setEditingSaida] = useState<Saida | null>(null);

  // Modal / Ação de Dar Baixa (Marcar como Pago)
  const [baixaModalSaida, setBaixaModalSaida] = useState<Saida | null>(null);
  const [baixaFormaPagamento, setBaixaFormaPagamento] = useState("Pix");

  // Formulário de Nova/Edição Conta Fixa
  const [modalContaFixa, setModalContaFixa] = useState<boolean>(false);
  const [editingContaFixa, setEditingContaFixa] = useState<ContaFixa | null>(null);
  const [nomeFixaInput, setNomeFixaInput] = useState("");
  const [valorFixaInput, setValorFixaInput] = useState("");
  const [categoriaFixaInput, setCategoriaFixaInput] = useState("Outros");
  const [diaVencimentoFixaInput, setDiaVencimentoFixaInput] = useState("10");
  const [obsFixaInput, setObsFixaInput] = useState("");

  // Carregar saídas e contas fixas
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resSaidas, resFixas] = await Promise.all([
        fetch("/api/saidas"),
        fetch("/api/contas-fixas"),
      ]);

      if (resSaidas.ok) {
        const data = await resSaidas.json();
        setSaidas(
          data.map((item: any) => ({
            ...item,
            valor: typeof item.valor === "string" ? parseFloat(item.valor) : item.valor,
          }))
        );
      }

      if (resFixas.ok) {
        const data = await resFixas.json();
        setContasFixas(
          data.map((item: any) => ({
            ...item,
            valor: typeof item.valor === "string" ? parseFloat(item.valor) : item.valor,
          }))
        );
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
          status: statusInput,
          fornecedor: fornecedorInput,
          dataVencimento: dataVencimentoInput ? new Date(dataVencimentoInput).toISOString() : null,
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
        // Reset do formulário
        setValorInput("");
        setDescricaoInput("");
        setFornecedorInput("");
        setDataVencimentoInput("");
        setStatusInput("pago");
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

  // Dar Baixa em Conta a Pagar
  const handleDarBaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baixaModalSaida) return;

    try {
      const res = await fetch(`/api/saidas/${baixaModalSaida.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...baixaModalSaida,
          status: "pago",
          formaPagamento: baixaFormaPagamento,
          dataPagamento: new Date().toISOString(),
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
        setBaixaModalSaida(null);
      }
    } catch (err) {
      console.error("Erro ao dar baixa na conta:", err);
    }
  };

  // Lançar Conta Fixa como Saída (1 clique)
  const handleLancarContaFixa = async (cf: ContaFixa) => {
    if (!confirm(`Deseja registrar o pagamento de "${cf.nome}" no valor de ${formatBRL(cf.valor)}?`)) return;

    try {
      const res = await fetch("/api/saidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor: cf.valor,
          categoria: cf.categoria || "Outros",
          descricao: `Conta Fixa: ${cf.nome}`,
          formaPagamento: "Pix",
          status: "pago",
          isFixa: true,
          dataSaida: new Date().toISOString(),
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
        alert(`Conta fixa "${cf.nome}" registrada com sucesso nas saídas!`);
      }
    } catch (err) {
      console.error("Erro ao lançar conta fixa:", err);
    }
  };

  // Salvar / Criar Conta Fixa
  const handleSaveContaFixa = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValor = parseMoney(valorFixaInput);
    if (!nomeFixaInput.trim()) {
      alert("Nome é obrigatório.");
      return;
    }
    if (!parsedValor || parsedValor <= 0) {
      alert("Digite um valor válido.");
      return;
    }

    try {
      const url = editingContaFixa ? `/api/contas-fixas/${editingContaFixa.id}` : "/api/contas-fixas";
      const method = editingContaFixa ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomeFixaInput,
          valor: parsedValor,
          categoria: categoriaFixaInput,
          diaVencimento: parseInt(diaVencimentoFixaInput, 10) || 10,
          observacoes: obsFixaInput,
          ativo: true,
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        const normalized = {
          ...saved,
          valor: typeof saved.valor === "string" ? parseFloat(saved.valor) : saved.valor,
        };

        if (editingContaFixa) {
          setContasFixas((prev) => prev.map((c) => (c.id === normalized.id ? normalized : c)));
        } else {
          setContasFixas((prev) => [...prev, normalized]);
        }
        setModalContaFixa(false);
        setEditingContaFixa(null);
        setNomeFixaInput("");
        setValorFixaInput("");
        setObsFixaInput("");
      }
    } catch (err) {
      console.error("Erro ao salvar conta fixa:", err);
    }
  };

  // Excluir Conta Fixa
  const handleDeleteContaFixa = async (id: string) => {
    if (!confirm("Deseja remover esta conta fixa?")) return;
    try {
      const res = await fetch(`/api/contas-fixas/${id}`, { method: "DELETE" });
      if (res.ok) {
        setContasFixas((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Erro ao excluir conta fixa:", err);
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
          status: editingSaida.status || "pago",
          dataVencimento: editingSaida.dataVencimento ? new Date(editingSaida.dataVencimento).toISOString() : null,
          dataPagamento: editingSaida.dataPagamento ? new Date(editingSaida.dataPagamento).toISOString() : null,
          fornecedor: editingSaida.fornecedor || "",
          isFixa: Boolean(editingSaida.isFixa),
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

      // Filtro por Aba ou Filtro de Status
      if (activeTab === "contas-a-pagar") {
        if (s.status !== "pendente") return false;
      } else if (statusFilter !== "all") {
        if ((s.status || "pago") !== statusFilter) return false;
      }

      // Filtro de categoria
      if (selectedCategoryFilter !== "all" && s.categoria !== selectedCategoryFilter) {
        return false;
      }

      // Filtro de busca na descrição ou fornecedor
      if (searchDesc.trim()) {
        const q = searchDesc.toLowerCase();
        const descMatch = (s.descricao || "").toLowerCase().includes(q);
        const catMatch = s.categoria.toLowerCase().includes(q);
        const fornMatch = (s.fornecedor || "").toLowerCase().includes(q);
        if (!descMatch && !catMatch && !fornMatch) return false;
      }

      return true;
    });
  }, [saidas, dateFilter, activeTab, statusFilter, selectedCategoryFilter, searchDesc]);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const total = filteredSaidas.reduce((acc, s) => acc + (s.valor || 0), 0);
    const count = filteredSaidas.length;
    const media = count > 0 ? total / count : 0;

    // Totais de Contas a Pagar no geral
    const totalPendente = saidas
      .filter((s) => s.status === "pendente")
      .reduce((acc, s) => acc + (s.valor || 0), 0);
    const countPendente = saidas.filter((s) => s.status === "pendente").length;

    // Total de Contas Fixas ativas
    const totalContasFixas = contasFixas
      .filter((c) => c.ativo)
      .reduce((acc, c) => acc + (c.valor || 0), 0);

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

    return {
      total,
      count,
      media,
      topCategory,
      topCategoryVal,
      categoryTotals,
      totalPendente,
      countPendente,
      totalContasFixas,
    };
  }, [filteredSaidas, saidas, contasFixas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <TrendingDown className="h-5 w-5" />
            </span>
            Saídas & Contas
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Controle de despesas, contas a pagar a fornecedores e despesas fixas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab("saidas")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            activeTab === "saidas"
              ? "bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Todas as Saídas</span>
          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            activeTab === "saidas"
              ? "bg-zinc-700 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-800"
              : "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}>
            {saidas.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("contas-a-pagar")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            activeTab === "contas-a-pagar"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Contas a Pagar</span>
          {stats.countPendente > 0 && (
            <span className="ml-1 rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white dark:bg-amber-600">
              {stats.countPendente}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("contas-fixas")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            activeTab === "contas-fixas"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
          }`}
        >
          <Repeat className="h-4 w-4" />
          <span>Contas Fixas (Mensais)</span>
          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            activeTab === "contas-fixas"
              ? "bg-indigo-700 text-indigo-100"
              : "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}>
            {contasFixas.length}
          </span>
        </button>
      </div>

      {/* Conteúdo da Aba Contas Fixas */}
      {activeTab === "contas-fixas" ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/40 p-5 shadow-sm dark:border-indigo-950 dark:from-indigo-950/20 dark:via-zinc-900 dark:to-blue-950/10">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Repeat className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Despesas Fixas Recorrentes
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-xl">
                Contas que você paga todo mês (aluguel, internet, contador, água, luz). Elas compõem seu custo operacional diário no Dashboard e você pode lançá-las como pagas com 1 toque.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingContaFixa(null);
                setNomeFixaInput("");
                setValorFixaInput("");
                setCategoriaFixaInput("Outros");
                setDiaVencimentoFixaInput("10");
                setObsFixaInput("");
                setModalContaFixa(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Nova Conta Fixa
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Total Fixo Mensal
              </p>
              <p className="mt-1 text-2xl font-black text-indigo-700 dark:text-indigo-300">
                {formatBRL(stats.totalContasFixas)}
              </p>
              <p className="mt-1 text-xs text-indigo-500/80">
                {contasFixas.filter((c) => c.ativo).length} contas ativas
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Custo Fixo Diário (30d)
              </p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                {formatBRL(stats.totalContasFixas / 30)}
              </p>
              <p className="mt-1 text-xs text-zinc-400">meta diária mínima de cobertura</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Maior Conta Fixa
              </p>
              <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white truncate">
                {contasFixas.length > 0
                  ? [...contasFixas].sort((a, b) => b.valor - a.valor)[0]?.nome
                  : "Nenhuma"}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {contasFixas.length > 0
                  ? formatBRL([...contasFixas].sort((a, b) => b.valor - a.valor)[0]?.valor || 0)
                  : "-"}
              </p>
            </div>
          </div>

          {/* Lista de Contas Fixas */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Suas Contas Fixas ({contasFixas.length})
              </h3>
            </div>
            {contasFixas.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">
                Nenhuma conta fixa cadastrada ainda. Clique em "Nova Conta Fixa" para adicionar.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {contasFixas.map((cf) => {
                  const catInfo = getCategoriaInfo(cf.categoria);
                  return (
                    <div
                      key={cf.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${catInfo.bg} ${catInfo.border} border`}>
                          {catInfo.icone}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">
                              {cf.nome}
                            </span>
                            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${catInfo.bg} ${catInfo.text}`}>
                              {cf.categoria}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Vencimento todo dia <strong>{cf.diaVencimento}</strong>
                            {cf.observacoes && ` • ${cf.observacoes}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <span className="text-base font-black text-zinc-900 dark:text-zinc-100">
                          {formatBRL(cf.valor)}
                          <span className="text-xs font-normal text-zinc-400">/mês</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleLancarContaFixa(cf)}
                            title="Lançar pagamento deste mês"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70 transition"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Pagar
                          </button>
                          <button
                            onClick={() => {
                              setEditingContaFixa(cf);
                              setNomeFixaInput(cf.nome);
                              setValorFixaInput(cf.valor.toString());
                              setCategoriaFixaInput(cf.categoria);
                              setDiaVencimentoFixaInput(cf.diaVencimento.toString());
                              setObsFixaInput(cf.observacoes || "");
                              setModalContaFixa(true);
                            }}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteContaFixa(cf.id)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                            title="Excluir"
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
        </div>
      ) : (
        <>
          {/* Card de Registro Rápido (1-Click UX) */}
          <div className="rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50/50 via-white to-orange-50/30 p-5 shadow-sm dark:border-rose-950/60 dark:from-rose-950/20 dark:via-zinc-900 dark:to-orange-950/10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white text-xs font-bold shadow">
                  +
                </span>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {statusInput === "pendente" ? "Lançar Conta a Pagar" : "Lançamento Rápido de Saída"}
                </h2>
              </div>

              {/* Toggle Status Já Pago vs A Pagar */}
              <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setStatusInput("pago")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    statusInput === "pago"
                      ? "bg-white text-emerald-700 shadow dark:bg-zinc-900 dark:text-emerald-400"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  ✓ Já Pago
                </button>
                <button
                  type="button"
                  onClick={() => setStatusInput("pendente")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    statusInput === "pendente"
                      ? "bg-amber-500 text-white shadow"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  ⏳ A Pagar (Pendente)
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSaida} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                {/* Valor */}
                <div className="md:col-span-3">
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

                {/* Fornecedor / Credor */}
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    Fornecedor / Credor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex.: Distribuidora X, Proprietário..."
                    value={fornecedorInput}
                    onChange={(e) => setFornecedorInput(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-600"
                  />
                </div>

                {/* Descrição Opcional */}
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    Descrição
                  </label>
                  <input
                    type="text"
                    placeholder="Ex.: Lote de chips T5, Chaves..."
                    value={descricaoInput}
                    onChange={(e) => setDescricaoInput(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-600"
                  />
                </div>

                {/* Pagamento ou Vencimento */}
                {statusInput === "pendente" ? (
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Vencimento
                    </label>
                    <input
                      type="date"
                      value={dataVencimentoInput}
                      onChange={(e) => setDataVencimentoInput(e.target.value)}
                      className="block w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                ) : (
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
                )}
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
                  <span className="text-xs text-zinc-500">Data Registro:</span>
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
                  className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                    statusInput === "pendente"
                      ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/25"
                      : "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/25"
                  }`}
                >
                  <Check className="h-4 w-4" />
                  {submitting
                    ? "Gravando..."
                    : statusInput === "pendente"
                    ? "Salvar Conta a Pagar"
                    : "Registrar Saída Paga"}
                </button>
              </div>
            </form>
          </div>

          {/* KPIs & Métricas */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                {activeTab === "contas-a-pagar" ? "Total a Pagar" : "Total de Saídas"}
              </p>
              <p className="mt-1 text-2xl font-black text-rose-700 dark:text-rose-300">
                {formatBRL(stats.total)}
              </p>
              <p className="mt-1 text-xs text-rose-500/80">
                {stats.count} registro{stats.count !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Contas a Pagar (Geral)
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-300">
                {formatBRL(stats.totalPendente)}
              </p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400/80">
                {stats.countPendente} pendente{stats.countPendente !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                Contas Fixas / Mês
              </p>
              <p className="mt-1 text-2xl font-bold text-indigo-800 dark:text-indigo-300">
                {formatBRL(stats.totalContasFixas)}
              </p>
              <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400/80">
                {contasFixas.length} contas cadastradas
              </p>
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

              {/* Filtro Status (se não estiver na aba fixa de a pagar) */}
              {activeTab === "saidas" && (
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                      statusFilter === "all" ? "bg-white dark:bg-zinc-900 shadow text-zinc-900 dark:text-white" : "text-zinc-500"
                    }`}
                  >
                    Todos Status
                  </button>
                  <button
                    onClick={() => setStatusFilter("pago")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                      statusFilter === "pago" ? "bg-emerald-600 text-white shadow" : "text-zinc-500"
                    }`}
                  >
                    Pagas ✓
                  </button>
                  <button
                    onClick={() => setStatusFilter("pendente")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                      statusFilter === "pendente" ? "bg-amber-600 text-white shadow" : "text-zinc-500"
                    }`}
                  >
                    A Pagar ⏳
                  </button>
                </div>
              )}

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
                placeholder="Buscar por fornecedor, descrição ou categoria..."
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
                {activeTab === "contas-a-pagar"
                  ? `Contas a Pagar Pendentes (${filteredSaidas.length})`
                  : `Registros Encontrados (${filteredSaidas.length})`}
              </h3>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Total: -{formatBRL(stats.total)}
              </span>
            </div>

            {loading ? (
              <div className="p-4">
                <SkeletonList count={5} />
              </div>
            ) : filteredSaidas.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {activeTab === "contas-a-pagar"
                    ? "Nenhuma conta a pagar pendente encontrada! 🎉"
                    : "Nenhuma saída encontrada para os filtros selecionados."}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Registre novas movimentações no formulário acima.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {filteredSaidas.map((s) => {
                  const catInfo = getCategoriaInfo(s.categoria);
                  const isPendente = s.status === "pendente";
                  const dataFormatada = new Date(s.dataSaida).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const vencimentoFormatado = s.dataVencimento
                    ? new Date(s.dataVencimento).toLocaleDateString("pt-BR")
                    : null;

                  return (
                    <div
                      key={s.id}
                      className="flex flex-col gap-2 p-4 transition hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${catInfo.bg} ${catInfo.border} border`}>
                          {catInfo.icone}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${catInfo.bg} ${catInfo.text}`}
                            >
                              {catInfo.label}
                            </span>

                            {/* Badge de Status */}
                            {isPendente ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/50">
                                <Clock className="h-3 w-3" />
                                A Pagar {vencimentoFormatado ? `(Vence ${vencimentoFormatado})` : ""}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                Pago
                              </span>
                            )}

                            {s.isFixa && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                                <Repeat className="h-3 w-3" />
                                Fixa
                              </span>
                            )}

                            {s.fornecedor && (
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                Fornecedor: {s.fornecedor}
                              </span>
                            )}

                            {s.formaPagamento && !isPendente && (
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
                        <span className={`text-base font-black ${
                          isPendente ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                        }`}>
                          - {formatBRL(s.valor)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isPendente && (
                            <button
                              onClick={() => {
                                setBaixaModalSaida(s);
                                setBaixaFormaPagamento("Pix");
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Dar Baixa
                            </button>
                          )}
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
        </>
      )}

      {/* Modal de Dar Baixa em Conta a Pagar */}
      {baixaModalSaida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Confirmar Pagamento
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Dar baixa na conta <strong>{baixaModalSaida.descricao || baixaModalSaida.categoria}</strong>
              {baixaModalSaida.fornecedor && ` (${baixaModalSaida.fornecedor})`} de{" "}
              <strong className="text-zinc-900 dark:text-white">{formatBRL(baixaModalSaida.valor)}</strong>.
            </p>

            <form onSubmit={handleDarBaixa} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                  Forma de Pagamento Utilizada
                </label>
                <select
                  value={baixaFormaPagamento}
                  onChange={(e) => setBaixaFormaPagamento(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setBaixaModalSaida(null)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-500"
                >
                  Confirmar Baixa ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Criação/Edição de Conta Fixa */}
      {modalContaFixa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Repeat className="h-4 w-4 text-indigo-600" />
                {editingContaFixa ? "Editar Conta Fixa" : "Nova Conta Fixa Mensal"}
              </h3>
              <button
                onClick={() => setModalContaFixa(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContaFixa} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                  Nome da Conta / Despesa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex.: Aluguel Casa, Internet Fibra, Contador..."
                  value={nomeFixaInput}
                  onChange={(e) => setNomeFixaInput(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                    Valor Mensal (R$) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={valorFixaInput}
                    onChange={(e) => setValorFixaInput(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                    Dia do Vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={diaVencimentoFixaInput}
                    onChange={(e) => setDiaVencimentoFixaInput(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                  Categoria
                </label>
                <select
                  value={categoriaFixaInput}
                  onChange={(e) => setCategoriaFixaInput(e.target.value)}
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
                  Observações (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex.: Boleto enviado por e-mail..."
                  value={obsFixaInput}
                  onChange={(e) => setObsFixaInput(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalContaFixa(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-indigo-500"
                >
                  Salvar Conta Fixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
