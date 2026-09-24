"use client";

import {
  CATEGORIAS_PADRAO,
  FORMAS_PAGAMENTO,
  getCategoriaInfo,
  formatVencimentoBR,
  parseDateInputToISO,
  formatDateForInput,
  type ContaFixa,
  type Credito,
  type Fornecedor,
  type Saida,
  type SaidaCategoria,
  type SaidaStatus,
} from "@/lib/saida";
import { formatBRL, parseMoney } from "@/lib/money";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Edit2,
  Filter,
  LayoutList,
  Plus,
  Receipt,
  RefreshCw,
  Repeat,
  Search,
  Table as TableIcon,
  Tag,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import { SkeletonList } from "@/components/ui/skeleton";
import { useEffect, useMemo, useState } from "react";

type DateFilterType = "today" | "yesterday" | "7d" | "month" | "30d" | "all";
type TabType = "saidas" | "contas-a-pagar" | "contas-fixas" | "creditos";

export function SaidasScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("saidas");

  // Saídas
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [contasFixas, setContasFixas] = useState<ContaFixa[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filtros
  const [dateFilter, setDateFilter] = useState<DateFilterType>("month");
  const [statusFilter, setStatusFilter] = useState<"all" | "pago" | "pendente">("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [searchDesc, setSearchDesc] = useState("");

  // Visualização e Ordenação (especialmente para Contas a Pagar e Saídas)
  const [viewMode, setViewMode] = useState<"table" | "list">("table");
  const [sortField, setSortField] = useState<"vencimento" | "valor" | "dataSaida" | "categoria" | "fornecedor">("vencimento");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Formulário de Registro Rápido
  const [valorInput, setValorInput] = useState("");
  const [categoriaInput, setCategoriaInput] = useState<string>("Ferramentas");
  const [descricaoInput, setDescricaoInput] = useState("");
  const [formaPagamentoInput, setFormaPagamentoInput] = useState<string>("Pix");
  const [statusInput, setStatusInput] = useState<SaidaStatus>("pago");
  const [fornecedorInput, setFornecedorInput] = useState("");
  const [taxaMesInput, setTaxaMesInput] = useState<string>("");
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
  // Formulário de Novo Crédito
  const [modalCredito, setModalCredito] = useState(false);
  const [creditoFornecedorInput, setCreditoFornecedorInput] = useState("");
  const [creditoValorOriginal, setCreditoValorOriginal] = useState("");
  const [creditoTaxaMes, setCreditoTaxaMes] = useState("");
  const [creditoNumParcelas, setCreditoNumParcelas] = useState("12");
  const [creditoValorParcela, setCreditoValorParcela] = useState("");
  const [creditoParcelasPagas, setCreditoParcelasPagas] = useState("0");
  const [creditoTipoVenc, setCreditoTipoVenc] = useState<"dia-fixo" | "d+n">("dia-fixo");
  const [creditoDiaVenc, setCreditoDiaVenc] = useState("10");
  const [creditoDiasApos, setCreditoDiasApos] = useState("30");
  const [creditoDataContratacao, setCreditoDataContratacao] = useState(() => new Date().toISOString().slice(0, 10));
  const [creditoDescricao, setCreditoDescricao] = useState("");
  const [savingCredito, setSavingCredito] = useState(false);

  // Modal de Detalhes / Amortização do Crédito
  const [creditoDetalheId, setCreditoDetalheId] = useState<string | null>(null);
  const [creditoDetalheData, setCreditoDetalheData] = useState<any | null>(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  // Helpers de fornecedor
  const fornecedorSelecionado = fornecedores.find(
    (f) => f.nome.toLowerCase() === fornecedorInput.trim().toLowerCase()
  );
  const isFornecedorCredito = fornecedorSelecionado?.tipo === "credito";

  // Auto-save de fornecedor ao perder foco (upsert silencioso)
  const handleFornecedorBlur = async (nome: string) => {
    const n = nome.trim();
    if (!n) return;
    try {
      const res = await fetch("/api/fornecedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: n }),
      });
      if (res.ok) {
        const salvo: Fornecedor = await res.json();
        setFornecedores((prev) => {
          const existe = prev.some((f) => f.id === salvo.id);
          return existe ? prev.map((f) => (f.id === salvo.id ? salvo : f)) : [...prev, salvo];
        });
      }
    } catch {
      // silencioso — não bloqueia o usuário
    }
  };

  // Cálculo da parcela estimada pelo PMT (Price)
  const calcularParcelaEstimada = (valor: string, taxa: string, parcelas: string) => {
    const pv = parseMoney(valor) || 0;
    const n = parseInt(parcelas) || 1;
    const i = (parseFloat(taxa) || 0) / 100;
    if (pv <= 0 || n <= 0) return "";
    if (i <= 0) return (pv / n).toFixed(2);
    const pmt = (pv * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1);
    return pmt.toFixed(2);
  };

  // Regra de 3: calcula a taxa % ao mês baseando-se no acréscimo total do valor pago
  // Total Pago = n * valorParcela. Acréscimo = (Total Pago - pv). Taxa mensal proporcional = (Acréscimo / pv) / n * 100
  const calcularTaxaPorRegraDeTres = (valor: string, parcela: string, parcelas: string) => {
    const pv = parseMoney(valor) || 0;
    const pmt = parseFloat(parcela) || 0;
    const n = parseInt(parcelas) || 1;
    if (pv <= 0 || pmt <= 0 || n <= 0) return "";
    const totalPago = pmt * n;
    const acrescimo = totalPago - pv;
    if (acrescimo <= 0) return "0.00";
    const taxaProporcionalMes = ((acrescimo / pv) / n) * 100;
    return taxaProporcionalMes.toFixed(2);
  };

  const handleOpenCreditoDetalhe = async (id: string) => {
    try {
      setCreditoDetalheId(id);
      setLoadingDetalhe(true);
      const res = await fetch(`/api/creditos/${id}`);
      if (res.ok) {
        setCreditoDetalheData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetalhe(false);
    }
  };

  const handleSaveCredito = async (e: React.FormEvent) => {
    e.preventDefault();
    const vOrig = parseMoney(creditoValorOriginal);
    if (!vOrig || vOrig <= 0) {
      alert("Informe um valor original válido.");
      return;
    }
    if (!creditoFornecedorInput.trim()) {
      alert("Informe o fornecedor do crédito.");
      return;
    }

    try {
      setSavingCredito(true);
      const res = await fetch("/api/creditos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fornecedorNome: creditoFornecedorInput.trim(),
          valorOriginal: vOrig,
          taxaMes: creditoTaxaMes ? parseFloat(creditoTaxaMes) / 100 : null,
          numParcelas: parseInt(creditoNumParcelas) || 1,
          valorParcela: creditoValorParcela ? parseFloat(creditoValorParcela) : null,
          tipoVencimento: creditoTipoVenc,
          diaVencimento: creditoTipoVenc === "dia-fixo" ? parseInt(creditoDiaVenc) : null,
          diasApos: creditoTipoVenc === "d+n" ? parseInt(creditoDiasApos) : null,
          dataContratacao: creditoDataContratacao,
          descricao: creditoDescricao.trim(),
          parcelasPagasInicial: parseInt(creditoParcelasPagas) || 0,
        }),
      });

      if (res.ok) {
        await fetchData();
        setModalCredito(false);
        // Reset campos
        setCreditoFornecedorInput("");
        setCreditoValorOriginal("");
        setCreditoTaxaMes("");
        setCreditoNumParcelas("12");
        setCreditoValorParcela("");
        setCreditoParcelasPagas("0");
        setCreditoDescricao("");
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao registrar crédito.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setSavingCredito(false);
    }
  };

  const handleDeleteCredito = async (id: string, fornecedor: string) => {
    if (!confirm(`Deseja cancelar o crédito com "${fornecedor}"? As parcelas pendentes serão removidas.`)) return;

    try {
      const res = await fetch(`/api/creditos/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchData();
        if (creditoDetalheId === id) setCreditoDetalheId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Carregar saídas, contas fixas, fornecedores e créditos
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resSaidas, resFixas, resFornecedores, resCreditos] = await Promise.all([
        fetch("/api/saidas"),
        fetch("/api/contas-fixas"),
        fetch("/api/fornecedores"),
        fetch("/api/creditos"),
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

      if (resFornecedores.ok) {
        setFornecedores(await resFornecedores.json());
      }

      if (resCreditos.ok) {
        const cData = await resCreditos.json();
        setCreditos(
          cData.map((c: any) => ({
            ...c,
            valorOriginal: typeof c.valorOriginal === "string" ? parseFloat(c.valorOriginal) : c.valorOriginal,
            valorParcela: typeof c.valorParcela === "string" ? parseFloat(c.valorParcela) : c.valorParcela,
            taxaMes: c.taxaMes != null ? (typeof c.taxaMes === "string" ? parseFloat(c.taxaMes) : c.taxaMes) : null,
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

      // Auto-save do fornecedor (sem bloquear o submit)
      if (fornecedorInput.trim()) {
        handleFornecedorBlur(fornecedorInput);
      }

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
          taxaMes: taxaMesInput ? parseFloat(taxaMesInput) / 100 : null,
          dataVencimento: parseDateInputToISO(dataVencimentoInput),
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
        setTaxaMesInput("");
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
          dataSaida: new Date().toISOString(), // data do pagamento real, não do vencimento
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

  // Lançar Conta Fixa como Saída / Pagar Conta Fixa
  const handleLancarContaFixa = async (cf: ContaFixa) => {
    if (!confirm(`Deseja registrar o pagamento de "${cf.nome}" no valor de ${formatBRL(cf.valor)}?`)) return;

    try {
      // Verificar se já existe uma saída pendente desta conta fixa neste mês
      const pendente = saidas.find((s) => {
        if (s.status !== "pendente") return false;
        const d = (s.descricao || "").toLowerCase();
        const n = cf.nome.toLowerCase();
        return d === `conta fixa: ${n}` || d === n || s.fornecedor?.toLowerCase() === n;
      });

      let res;
      if (pendente) {
        // Dá baixa diretamente na saída pendente
        res = await fetch(`/api/saidas/${pendente.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...pendente,
            status: "pago",
            formaPagamento: "Pix",
            dataPagamento: new Date().toISOString(),
            dataSaida: new Date().toISOString(), // data do pagamento real, não do vencimento
          }),
        });
      } else {
        // Cria diretamente como paga
        res = await fetch("/api/saidas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            valor: cf.valor,
            categoria: cf.categoria || "Outros",
            descricao: `Conta Fixa: ${cf.nome}`,
            formaPagamento: "Pix",
            status: "pago",
            isFixa: true,
            fornecedor: cf.nome,
            dataSaida: new Date().toISOString(),
          }),
        });
      }

      if (res.ok) {
        const itemAtualizado = await res.json();
        setSaidas((prev) => {
          const exists = prev.some((s) => s.id === itemAtualizado.id);
          if (exists) {
            return prev.map((s) =>
              s.id === itemAtualizado.id
                ? {
                    ...itemAtualizado,
                    valor: typeof itemAtualizado.valor === "string" ? parseFloat(itemAtualizado.valor) : itemAtualizado.valor,
                  }
                : s
            );
          } else {
            return [
              {
                ...itemAtualizado,
                valor: typeof itemAtualizado.valor === "string" ? parseFloat(itemAtualizado.valor) : itemAtualizado.valor,
              },
              ...prev,
            ];
          }
        });
        alert(`Conta fixa "${cf.nome}" registrada como paga com sucesso!`);
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
          dataVencimento: parseDateInputToISO(editingSaida.dataVencimento),
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
    let maxDate: Date | null = null;
    let isYesterday = false;
    let endOfYesterday: Date | null = null;

    if (dateFilter === "today") {
      cutoffDate = startOfToday;
      maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFilter === "yesterday") {
      isYesterday = true;
      cutoffDate = new Date(startOfToday);
      cutoffDate.setDate(cutoffDate.getDate() - 1);
      endOfYesterday = new Date(cutoffDate);
      endOfYesterday.setDate(endOfYesterday.getDate() + 1);
    } else if (dateFilter === "month") {
      // Dia 1 ao último dia do mês corrente
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      maxDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (dateFilter === "7d") {
      cutoffDate = new Date(startOfToday);
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (dateFilter === "30d") {
      cutoffDate = new Date(startOfToday);
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    }

    const result = saidas.filter((s) => {
      // Filtro de data:
      // Se for "Contas a Pagar", a referência principal de data deve ser o VENCIMENTO (s.dataVencimento || s.dataSaida)
      // Se for "Todas as Saídas", a referência é a data do pagamento/registro (s.dataSaida)
      const dateToCompare = activeTab === "contas-a-pagar"
        ? (s.dataVencimento ? new Date(s.dataVencimento) : new Date(s.dataSaida))
        : new Date(s.dataSaida);

      if (cutoffDate) {
        if (isYesterday && endOfYesterday) {
          if (dateToCompare < cutoffDate || dateToCompare >= endOfYesterday) return false;
        } else {
          if (dateToCompare < cutoffDate) return false;
          if (maxDate && dateToCompare > maxDate) return false;
        }
      }

      // Filtro por Aba ou Filtro de Status
      if (activeTab === "contas-a-pagar") {
        if (s.status !== "pendente") return false;
      } else if (activeTab === "saidas") {
        // "Todas as Saídas" exibe APENAS saídas pagas — pendentes ficam em Contas a Pagar
        if (s.status === "pendente") return false;
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

    // Ordenação dos resultados
    return [...result].sort((a, b) => {
      let comparison = 0;

      if (sortField === "valor") {
        comparison = (a.valor || 0) - (b.valor || 0);
      } else if (sortField === "vencimento") {
        const dateA = a.dataVencimento ? new Date(a.dataVencimento).getTime() : a.dataSaida ? new Date(a.dataSaida).getTime() : 0;
        const dateB = b.dataVencimento ? new Date(b.dataVencimento).getTime() : b.dataSaida ? new Date(b.dataSaida).getTime() : 0;
        // Se ambos têm vencimento ou fallback, compara datas
        if (dateA && dateB) {
          comparison = dateA - dateB;
        } else if (dateA) {
          comparison = -1;
        } else if (dateB) {
          comparison = 1;
        } else {
          comparison = 0;
        }
      } else if (sortField === "categoria") {
        comparison = (a.categoria || "").localeCompare(b.categoria || "");
      } else if (sortField === "fornecedor") {
        const fnA = a.fornecedor || a.descricao || "";
        const fnB = b.fornecedor || b.descricao || "";
        comparison = fnA.localeCompare(fnB);
      } else {
        // dataSaida
        const dateA = new Date(a.dataSaida).getTime();
        const dateB = new Date(b.dataSaida).getTime();
        comparison = dateA - dateB;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [saidas, dateFilter, activeTab, statusFilter, selectedCategoryFilter, searchDesc, sortField, sortOrder]);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    // Total Geral Filtrado
    const total = filteredSaidas.reduce((acc, s) => acc + (s.valor || 0), 0);
    const count = filteredSaidas.length;
    const media = count > 0 ? total / count : 0;

    // Saídas Efetivamente PAGAS no filtro
    const saidasPagas = filteredSaidas.filter((s) => s.status !== "pendente");
    const totalPagas = saidasPagas.reduce((acc, s) => acc + (s.valor || 0), 0);
    const countPagas = saidasPagas.length;

    // Contas a Pagar (Pendentes) no filtro
    const saidasPendentes = filteredSaidas.filter((s) => s.status === "pendente");
    const totalPendentesFiltro = saidasPendentes.reduce((acc, s) => acc + (s.valor || 0), 0);
    const countPendentesFiltro = saidasPendentes.length;

    // Totais de Contas a Pagar no geral (banco inteiro)
    const totalPendente = saidas
      .filter((s) => s.status === "pendente")
      .reduce((acc, s) => acc + (s.valor || 0), 0);
    const countPendente = saidas.filter((s) => s.status === "pendente").length;

    // Contas Vencidas (status = pendente e dataVencimento < hoje)
    const hojeStr = new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD" local
    const contasVencidas = saidas.filter((s) => {
      if (s.status !== "pendente" || !s.dataVencimento) return false;
      const vStr = s.dataVencimento.split("T")[0];
      return vStr < hojeStr;
    });
    const totalVencidas = contasVencidas.reduce((acc, s) => acc + (s.valor || 0), 0);
    const countVencidas = contasVencidas.length;

    // Total de Contas Fixas ativas
    const totalContasFixas = contasFixas
      .filter((c) => c.ativo)
      .reduce((acc, c) => acc + (c.valor || 0), 0);

    // Contas Fixas pagas e pendentes no mês corrente
    const inicioMesAtual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const fixasDoMesPagas = saidas.filter((s) => {
      if (!s.isFixa || s.status === "pendente") return false;
      return new Date(s.dataSaida) >= inicioMesAtual;
    });
    const totalFixasPagasMes = fixasDoMesPagas.reduce((acc, s) => acc + (s.valor || 0), 0);
    const countFixasPagasMes = fixasDoMesPagas.length;

    const fixasDoMesPendentes = saidas.filter((s) => s.isFixa && s.status === "pendente");
    const totalFixasPendentesMes = fixasDoMesPendentes.reduce((acc, s) => acc + (s.valor || 0), 0);
    const countFixasPendentesMes = fixasDoMesPendentes.length;

    const countContasFixasAtivas = contasFixas.filter((c) => c.ativo).length;

    return {
      total,
      count,
      media,
      saidasPagas,
      totalPagas,
      countPagas,
      totalPendentesFiltro,
      countPendentesFiltro,
      totalPendente,
      countPendente,
      totalVencidas,
      countVencidas,
      totalContasFixas,
      totalFixasPagasMes,
      countFixasPagasMes,
      totalFixasPendentesMes,
      countFixasPendentesMes,
      countContasFixasAtivas,
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

        <button
          onClick={() => setActiveTab("creditos")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            activeTab === "creditos"
              ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Crédito & Empréstimos</span>
          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            activeTab === "creditos"
              ? "bg-violet-700 text-violet-100"
              : "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}>
            {creditos.filter((c) => c.status === "ativo").length}
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
      ) : activeTab === "creditos" ? (
        /* Aba de Crédito & Empréstimos */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/60 via-white to-purple-50/40 p-5 shadow-sm dark:border-violet-950 dark:from-violet-950/20 dark:via-zinc-900 dark:to-purple-950/10">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                Controle de Empréstimos & Financiamentos
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-xl">
                Registre empréstimos (MercadoPago, bancos). O sistema gera as parcelas automaticamente no Contas a Pagar, rastreia amortização do capital e simula juros em tempo real.
              </p>
            </div>
            <button
              onClick={() => {
                setCreditoFornecedorInput("");
                setCreditoValorOriginal("");
                setCreditoTaxaMes("");
                setCreditoNumParcelas("12");
                setCreditoValorParcela("");
                setCreditoDescricao("");
                setModalCredito(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-600/20 hover:bg-violet-500 active:scale-95 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Novo Crédito / Empréstimo
            </button>
          </div>

          {/* Cards de Métricas de Crédito */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                Total Contratado (Original)
              </p>
              <p className="mt-1 text-2xl font-black text-violet-700 dark:text-violet-300">
                {formatBRL(creditos.reduce((acc, c) => acc + (c.valorOriginal || 0), 0))}
              </p>
              <p className="mt-1 text-xs text-violet-500/80">
                {creditos.length} contrato(s) no total
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Créditos Ativos
              </p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                {creditos.filter((c) => c.status === "ativo").length}
              </p>
              <p className="mt-1 text-xs text-zinc-400">em processo de amortização</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm dark:border-emerald-950 dark:bg-emerald-950/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Quitados / Finalizados
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                {creditos.filter((c) => c.status === "quitado").length}
              </p>
              <p className="mt-1 text-xs text-emerald-600/80">contratos 100% pagos</p>
            </div>
          </div>

          {/* Tabela de Créditos */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Contratos de Crédito Cadastrados ({creditos.length})
              </h3>
            </div>
            {creditos.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">
                Nenhum crédito cadastrado. Clique no botão acima para adicionar um empréstimo.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Fornecedor / Credor</th>
                      <th className="py-3 px-4">Valor Original</th>
                      <th className="py-3 px-4">Taxa / Mês</th>
                      <th className="py-3 px-4">Parcelas</th>
                      <th className="py-3 px-4">Valor Parcela</th>
                      <th className="py-3 px-4">Progresso</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {creditos.map((c) => {
                      const progresso = Math.min(100, Math.round(((c.parcelasPagas || 0) / c.numParcelas) * 100));
                      const isQuitado = c.status === "quitado" || c.parcelasPagas >= c.numParcelas;
                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition cursor-pointer"
                          onClick={() => handleOpenCreditoDetalhe(c.id)}
                        >
                          <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white">
                            <div>
                              <span>{c.fornecedorNome}</span>
                              {c.descricao && (
                                <p className="text-[11px] font-normal text-zinc-500">{c.descricao}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-white">
                            {formatBRL(c.valorOriginal)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {c.taxaMes != null ? (
                              <span className="font-bold text-violet-600 dark:text-violet-400">
                                {(Number(c.taxaMes) * 100).toFixed(2)}% a.m.
                              </span>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {c.numParcelas}x
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-white">
                            {formatBRL(c.valorParcela)}
                          </td>
                          <td className="py-3.5 px-4 min-w-[140px]">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-semibold text-zinc-500">
                                <span>{c.parcelasPagas} de {c.numParcelas} pagas</span>
                                <span>{progresso}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isQuitado ? "bg-emerald-500" : "bg-violet-500"
                                  }`}
                                  style={{ width: `${progresso}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isQuitado ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" /> Quitado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-800 dark:bg-violet-950/60 dark:text-violet-300">
                                <Clock className="h-3 w-3" /> Ativo
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenCreditoDetalhe(c.id)}
                                className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-violet-100 hover:text-violet-700 transition dark:bg-zinc-800 dark:text-zinc-300"
                                title="Ver Parcelas e Simular Amortização"
                              >
                                Ver Parcelas
                              </button>
                              <button
                                onClick={() => handleDeleteCredito(c.id, c.fornecedorNome)}
                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                title="Cancelar Crédito"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                <div className={isFornecedorCredito ? "md:col-span-2" : "md:col-span-3"}>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    Fornecedor / Credor
                    {isFornecedorCredito && (
                      <span className="ml-2 inline-flex items-center gap-0.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                        <CreditCard className="h-2.5 w-2.5" /> Crédito
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    list="fornecedores-list"
                    placeholder="Ex.: Gold Floripa, MercadoPago..."
                    value={fornecedorInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFornecedorInput(val);
                      // Ao selecionar um fornecedor de crédito, pre-preenche categoria e taxa
                      const match = fornecedores.find(
                        (f) => f.nome.toLowerCase() === val.trim().toLowerCase()
                      );
                      if (match?.tipo === "credito") {
                        if (match.categoria) setCategoriaInput(match.categoria);
                        if (match.taxaMes != null) setTaxaMesInput(String((match.taxaMes * 100).toFixed(4)));
                      }
                    }}
                    onBlur={(e) => handleFornecedorBlur(e.target.value)}
                    className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium placeholder-zinc-400 focus:outline-none focus:ring-2 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-600 ${
                      isFornecedorCredito
                        ? "border-violet-400 bg-violet-50 text-violet-900 focus:border-violet-500 focus:ring-violet-500/20 dark:border-violet-700 dark:bg-violet-950/20 dark:text-violet-100"
                        : "border-zinc-300 bg-white text-zinc-900 focus:border-rose-500 focus:ring-rose-500/20 dark:border-zinc-700"
                    }`}
                  />
                  <datalist id="fornecedores-list">
                    {fornecedores.map((f) => (
                      <option key={f.id} value={f.nome}>
                        {f.tipo === "credito" ? `💳 ${f.nome}` : f.nome}
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* Taxa ao Mês — só aparece para fornecedores de crédito */}
                {isFornecedorCredito && (
                  <div className="md:col-span-1">
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                      Taxa / Mês (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="3.98"
                        value={taxaMesInput}
                        onChange={(e) => setTaxaMesInput(e.target.value)}
                        className="block w-full rounded-xl border border-violet-400 bg-violet-50 py-2.5 pl-3 pr-8 text-sm font-semibold text-violet-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-violet-700 dark:bg-violet-950/20 dark:text-violet-100"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs font-bold text-violet-500">%</span>
                    </div>
                  </div>
                )}


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
                {activeTab === "contas-a-pagar" ? "Total a Pagar" : "Total Saídas Pagas"}
              </p>
              <p className="mt-1 text-2xl font-black text-rose-700 dark:text-rose-300">
                {formatBRL(activeTab === "contas-a-pagar" ? stats.totalPendentesFiltro : stats.totalPagas)}
              </p>
              <p className="mt-1 text-xs text-rose-500/80">
                {activeTab === "contas-a-pagar"
                  ? `${stats.countPendentesFiltro} conta(s) no filtro`
                  : `${stats.countPagas} saída(s) paga(s)`}
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
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  Contas Fixas / Mês
                </p>
                <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400">
                  {stats.countContasFixasAtivas} ativa{stats.countContasFixasAtivas !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-2xl font-bold text-indigo-800 dark:text-indigo-300">
                {formatBRL(stats.totalContasFixas)}
              </p>

              {/* Barra de progresso pago vs pendente */}
              {stats.totalContasFixas > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="w-full h-1.5 rounded-full bg-indigo-200/60 dark:bg-indigo-900/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (stats.totalFixasPagasMes / stats.totalContasFixas) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Pago: {formatBRL(stats.totalFixasPagasMes)}
                      {stats.countFixasPagasMes > 0 && (
                        <span className="text-emerald-500/70">({stats.countFixasPagasMes})</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      {stats.countFixasPendentesMes > 0 && (
                        <span className="text-amber-500/70">({stats.countFixasPendentesMes})</span>
                      )}
                      Falta: {formatBRL(stats.totalFixasPendentesMes)}
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/30">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Contas Vencidas
                </p>
                {stats.countVencidas > 0 && (
                  <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                )}
              </div>
              <p className="mt-1 text-2xl font-black text-rose-800 dark:text-rose-300">
                {formatBRL(stats.totalVencidas)}
              </p>
              <p className="mt-1 text-xs font-medium text-rose-600/90 dark:text-rose-400/80">
                {stats.countVencidas > 0
                  ? `${stats.countVencidas} conta(s) em atraso!`
                  : "Nenhuma conta em atraso"}
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
                        ? activeTab === "contas-a-pagar"
                          ? "bg-amber-500 text-white shadow shadow-amber-500/20"
                          : "bg-rose-600 text-white shadow dark:bg-rose-500"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Filtro Status (apenas na aba saídas — e somente "Pagas" pois pendentes vão para Contas a Pagar) */}
              {activeTab === "saidas" && (
                <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 border border-emerald-200/50 dark:border-emerald-800/40">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Apenas saídas pagas</span>
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

          {/* Lista ou Tabela de Saídas / Contas a Pagar */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {/* Cabeçalho da Listagem / Tabela com Alternador de View e Ordenação */}
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-800/40">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {activeTab === "contas-a-pagar"
                    ? `Contas a Pagar Pendentes (${filteredSaidas.length})`
                    : `Registros Encontrados (${filteredSaidas.length})`}
                </h3>
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {activeTab === "contas-a-pagar"
                    ? `Total a Pagar: ${formatBRL(stats.totalPendentesFiltro)}`
                    : statusFilter === "pendente"
                    ? `Total a Pagar: ${formatBRL(stats.totalPendentesFiltro)}`
                    : statusFilter === "pago"
                    ? `Total Pago: ${formatBRL(stats.totalPagas)}`
                    : `Total Pago: ${formatBRL(stats.totalPagas)}`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Seletores rápidos de ordenação */}
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="hidden md:inline font-medium">Ordenar:</span>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as any)}
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value="vencimento">📅 Vencimento</option>
                    <option value="valor">💰 Valor (R$)</option>
                    <option value="dataSaida">🕒 Data de Lançamento</option>
                    <option value="fornecedor">🏢 Fornecedor / Nome</option>
                    <option value="categoria">🏷️ Categoria</option>
                  </select>

                  <button
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    title={sortOrder === "asc" ? "Ordem Crescente (clique p/ Decrescente)" : "Ordem Decrescente (clique p/ Crescente)"}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
                  >
                    {sortOrder === "asc" ? (
                      <>
                        <ArrowUp className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                        <span className="text-[11px] font-bold">Crescente</span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                        <span className="text-[11px] font-bold">Decrescente</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Alternador de Visualização: Tabela vs Lista */}
                <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <button
                    onClick={() => setViewMode("table")}
                    title="Visualização em Tabela"
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition ${
                      viewMode === "table"
                        ? "bg-rose-600 text-white shadow"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    <TableIcon className="h-3.5 w-3.5" />
                    <span>Tabela</span>
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    title="Visualização em Lista / Cards"
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition ${
                      viewMode === "list"
                        ? "bg-rose-600 text-white shadow"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                    <span>Cards</span>
                  </button>
                </div>
              </div>
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
            ) : viewMode === "table" ? (
              /* MODO TABELA */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-100/75 dark:border-zinc-800 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 font-semibold uppercase tracking-wider">
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-rose-600 transition select-none"
                        onClick={() => {
                          if (sortField === "vencimento") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortField("vencimento");
                            setSortOrder("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span>{activeTab === "saidas" ? "Data Pagamento" : "Vencimento"}</span>
                          {sortField === "vencimento" ? (
                            sortOrder === "asc" ? <ArrowUp className="h-3 w-3 text-rose-600" /> : <ArrowDown className="h-3 w-3 text-rose-600" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-rose-600 transition select-none"
                        onClick={() => {
                          if (sortField === "fornecedor") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortField("fornecedor");
                            setSortOrder("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span>Fornecedor / Descrição</span>
                          {sortField === "fornecedor" ? (
                            sortOrder === "asc" ? <ArrowUp className="h-3 w-3 text-rose-600" /> : <ArrowDown className="h-3 w-3 text-rose-600" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-rose-600 transition select-none"
                        onClick={() => {
                          if (sortField === "categoria") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortField("categoria");
                            setSortOrder("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span>Categoria</span>
                          {sortField === "categoria" ? (
                            sortOrder === "asc" ? <ArrowUp className="h-3 w-3 text-rose-600" /> : <ArrowDown className="h-3 w-3 text-rose-600" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-rose-600 transition select-none text-right"
                        onClick={() => {
                          if (sortField === "valor") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortField("valor");
                            setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                          }
                        }}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Valor</span>
                          {sortField === "valor" ? (
                            sortOrder === "asc" ? <ArrowUp className="h-3 w-3 text-rose-600" /> : <ArrowDown className="h-3 w-3 text-rose-600" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                    {filteredSaidas.map((s) => {
                      const catInfo = getCategoriaInfo(s.categoria);
                      const isPendente = s.status === "pendente";

                      const vencimentoFormatado = s.dataVencimento
                        ? formatVencimentoBR(s.dataVencimento)
                        : formatVencimentoBR(s.dataSaida);

                      // Calcular se está vencida hoje ou em atraso com timezone local
                      let isVencida = false;
                      let isVenceHoje = false;
                      if (isPendente && s.dataVencimento) {
                        const vStr = s.dataVencimento.split("T")[0]; // "YYYY-MM-DD"
                        const hojeStr = new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD" local
                        if (vStr < hojeStr) isVencida = true;
                        else if (vStr === hojeStr) isVenceHoje = true;
                      }

                      return (
                        <tr
                          key={s.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition group"
                        >
                          {/* Data: contextual por aba */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {activeTab === "saidas" ? (
                              /* Aba "Todas as Saídas" — exibe data de pagamento/lançamento */
                              <div>
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                  {new Date(s.dataSaida).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })}
                                </span>
                                {s.formaPagamento && (
                                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                                    via {s.formaPagamento}
                                  </span>
                                )}
                              </div>
                            ) : (
                              /* Aba "Contas a Pagar" — exibe vencimento com badges */
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-semibold ${
                                    isVencida
                                      ? "text-rose-600 font-bold dark:text-rose-400"
                                      : isVenceHoje
                                      ? "text-amber-600 font-bold dark:text-amber-400"
                                      : "text-zinc-800 dark:text-zinc-200"
                                  }`}>
                                    {vencimentoFormatado}
                                  </span>
                                  {isVencida && (
                                    <span className="rounded bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                                      Atrasada
                                    </span>
                                  )}
                                  {isVenceHoje && (
                                    <span className="rounded bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                      Hoje
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-zinc-400 block mt-0.5">
                                  Lançado {new Date(s.dataSaida).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Fornecedor / Descrição */}
                          <td className="py-3.5 px-4 max-w-[280px]">
                            <div className="flex items-center gap-2">
                              {s.fornecedor ? (
                                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                  {s.fornecedor}
                                </span>
                              ) : (
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                  {s.descricao || "Sem identificação"}
                                </span>
                              )}
                              {s.isFixa && (
                                <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50">
                                  <Repeat className="h-2.5 w-2.5" />
                                  Fixa
                                </span>
                              )}
                              {s.creditoId && (
                                <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200/50">
                                  <CreditCard className="h-2.5 w-2.5" />
                                  Crédito
                                </span>
                              )}
                            </div>
                            {s.descricao && s.fornecedor && (
                              <p className="text-zinc-500 dark:text-zinc-400 text-[11px] truncate mt-0.5">
                                {s.descricao}
                              </p>
                            )}
                          </td>

                          {/* Categoria */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold ${catInfo.bg} ${catInfo.text}`}>
                              <span>{catInfo.icone}</span>
                              <span>{catInfo.label}</span>
                            </span>
                          </td>

                          {/* Valor */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-sm">
                            <span className={isPendente ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}>
                              - {formatBRL(s.valor)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {isPendente ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300/50">
                                <Clock className="h-3 w-3" />
                                A Pagar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                Pago
                              </span>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPendente && (
                                <button
                                  onClick={() => {
                                    setBaixaModalSaida(s);
                                    setBaixaFormaPagamento("Pix");
                                  }}
                                  title="Dar Baixa (Registrar Pagamento)"
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow hover:bg-emerald-500 transition active:scale-95"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Dar Baixa</span>
                                </button>
                              )}
                              <button
                                onClick={() => setEditingSaida(s)}
                                title="Editar"
                                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(s.id)}
                                title="Excluir"
                                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* MODO LISTA / CARDS */
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
                    ? formatVencimentoBR(s.dataVencimento)
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

      {/* Modal de Edição de Saída / Conta a Pagar */}
      {editingSaida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-rose-600" />
                {editingSaida.status === "pendente" ? "Editar Conta a Pagar" : "Editar Saída"}
              </h3>
              <button
                onClick={() => setEditingSaida(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                    Valor (R$) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      typeof editingSaida.valor === "number"
                        ? editingSaida.valor.toFixed(2).replace(".", ",")
                        : editingSaida.valor
                    }
                    onChange={(e) =>
                      setEditingSaida({
                        ...editingSaida,
                        valor: e.target.value as any,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                    Status
                  </label>
                  <select
                    value={editingSaida.status || "pago"}
                    onChange={(e) =>
                      setEditingSaida({
                        ...editingSaida,
                        status: e.target.value as SaidaStatus,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="pago">Pago ✓</option>
                    <option value="pendente">A Pagar (Pendente) ⏳</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                  Categoria <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editingSaida.categoria}
                  onChange={(e) =>
                    setEditingSaida({
                      ...editingSaida,
                      categoria: e.target.value,
                    })
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                    Fornecedor / Favorecido
                  </label>
                  <input
                    type="text"
                    list="fornecedores-list-edit"
                    placeholder="Ex.: Gold Floripa, MercadoPago..."
                    value={editingSaida.fornecedor || ""}
                    onChange={(e) =>
                      setEditingSaida({
                        ...editingSaida,
                        fornecedor: e.target.value,
                      })
                    }
                    onBlur={(e) => handleFornecedorBlur(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  />
                  <datalist id="fornecedores-list-edit">
                    {fornecedores.map((f) => (
                      <option key={f.id} value={f.nome} />
                    ))}
                  </datalist>
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
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                    Data do Vencimento
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(editingSaida.dataVencimento)}
                    onChange={(e) =>
                      setEditingSaida({
                        ...editingSaida,
                        dataVencimento: e.target.value || null,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                    Data do Registro
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      editingSaida.dataSaida
                        ? new Date(new Date(editingSaida.dataSaida).getTime() - new Date().getTimezoneOffset() * 60000)
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      setEditingSaida({
                        ...editingSaida,
                        dataSaida: e.target.value ? new Date(e.target.value).toISOString() : editingSaida.dataSaida,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex.: Chaves virgens pantográficas, troca de óleo..."
                  value={editingSaida.descricao || ""}
                  onChange={(e) =>
                    setEditingSaida({
                      ...editingSaida,
                      descricao: e.target.value,
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

      {/* Modal de Registro de Novo Crédito */}
      {modalCredito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-violet-600" />
                Registrar Novo Crédito / Empréstimo
              </h2>
              <button
                onClick={() => setModalCredito(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCredito} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                  Fornecedor / Credor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="fornecedores-credito-list"
                  placeholder="Ex.: MercadoPago, Nubank, Banco Itaú..."
                  value={creditoFornecedorInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCreditoFornecedorInput(val);
                    const match = fornecedores.find(
                      (f) => f.nome.toLowerCase() === val.trim().toLowerCase()
                    );
                    if (match) {
                      if (match.taxaMes != null) {
                        const tStr = String((match.taxaMes * 100).toFixed(2));
                        setCreditoTaxaMes(tStr);
                        const calc = calcularParcelaEstimada(creditoValorOriginal, tStr, creditoNumParcelas);
                        if (calc) setCreditoValorParcela(calc);
                      }
                      if (match.tipoVencimento) setCreditoTipoVenc(match.tipoVencimento);
                      if (match.diaVencimento) setCreditoDiaVenc(String(match.diaVencimento));
                      if (match.diasApos) setCreditoDiasApos(String(match.diasApos));
                    }
                  }}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white focus:border-violet-500 focus:outline-none"
                />
                <datalist id="fornecedores-credito-list">
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.nome}>
                      {f.tipo === "credito" ? `💳 ${f.nome}` : f.nome}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                    Valor Original (R$) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: 5.000,00"
                    value={creditoValorOriginal}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreditoValorOriginal(val);
                      const calc = calcularParcelaEstimada(val, creditoTaxaMes, creditoNumParcelas);
                      if (calc) setCreditoValorParcela(calc);
                    }}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-black text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400 mb-1">
                    Taxa / Mês (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex.: 3.98"
                      value={creditoTaxaMes}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreditoTaxaMes(val);
                        const calc = calcularParcelaEstimada(creditoValorOriginal, val, creditoNumParcelas);
                        if (calc) setCreditoValorParcela(calc);
                      }}
                      className="w-full rounded-xl border border-violet-300 bg-violet-50/50 py-2 pl-3.5 pr-8 text-sm font-bold text-violet-900 dark:border-violet-700 dark:bg-zinc-950 dark:text-violet-100"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-violet-500">
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                    Número de Parcelas <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={creditoNumParcelas}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreditoNumParcelas(val);
                      const calc = calcularParcelaEstimada(creditoValorOriginal, creditoTaxaMes, val);
                      if (calc) setCreditoValorParcela(calc);
                    }}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      Valor da Parcela (R$)
                    </label>
                    <span className="text-[10px] text-zinc-400 font-normal">editável</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Auto ou informe"
                    value={creditoValorParcela}
                    onChange={(e) => {
                      const pVal = e.target.value;
                      setCreditoValorParcela(pVal);
                      // Se o usuário digitou a parcela manualmente, oferece cálculo da taxa por regra de três
                      if (pVal && creditoValorOriginal) {
                        const tCalc = calcularTaxaPorRegraDeTres(creditoValorOriginal, pVal, creditoNumParcelas);
                        if (tCalc) setCreditoTaxaMes(tCalc);
                      }
                    }}
                    className="w-full rounded-xl border border-emerald-300 bg-emerald-50/40 px-3.5 py-2 text-sm font-black text-emerald-900 dark:border-emerald-700 dark:bg-zinc-950 dark:text-emerald-300"
                  />
                </div>
              </div>

              {/* Botão de Atalho para Regra de 3 */}
              {creditoValorOriginal && creditoValorParcela && (
                <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50/40 px-3 py-2 text-xs dark:border-violet-950 dark:bg-violet-950/20">
                  <div className="text-zinc-600 dark:text-zinc-300">
                    Total a pagar: <strong>{formatBRL(Number(creditoValorParcela) * (parseInt(creditoNumParcelas) || 1))}</strong>
                    {" "}(Juros totais: {formatBRL(Math.max(0, (Number(creditoValorParcela) * (parseInt(creditoNumParcelas) || 1)) - (parseMoney(creditoValorOriginal) || 0)))})
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const t = calcularTaxaPorRegraDeTres(creditoValorOriginal, creditoValorParcela, creditoNumParcelas);
                      if (t) setCreditoTaxaMes(t);
                    }}
                    className="rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-violet-500 shadow-sm"
                  >
                    Calcular Taxa p/ Regra de 3
                  </button>
                </div>
              )}

              {/* Financiamento Já em Andamento */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-950 dark:bg-amber-950/20">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Já começou a pagar? (Em andamento)
                  </label>
                  <span className="text-[10px] text-amber-700 font-semibold">Ex: moto, carro, imóvel</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={creditoNumParcelas || undefined}
                    value={creditoParcelasPagas}
                    onChange={(e) => setCreditoParcelasPagas(e.target.value)}
                    className="w-24 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-950 dark:border-amber-700 dark:bg-zinc-950 dark:text-amber-100"
                  />
                  <span className="text-xs text-amber-800 dark:text-amber-400">
                    parcelas já pagas (essas entram como quitadas automaticamente)
                  </span>
                </div>
              </div>

              {/* Vencimento */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Tipo de Vencimento</label>
                    <select
                      value={creditoTipoVenc}
                      onChange={(e) => setCreditoTipoVenc(e.target.value as "dia-fixo" | "d+n")}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    >
                      <option value="dia-fixo">📅 Dia Fixo do Mês</option>
                      <option value="d+n">⏱️ D+N Dias (Prazo)</option>
                    </select>
                  </div>

                  {creditoTipoVenc === "dia-fixo" ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Dia Vencimento</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={creditoDiaVenc}
                        onChange={(e) => setCreditoDiaVenc(e.target.value)}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Dias de Intervalo</label>
                      <input
                        type="number"
                        min="1"
                        value={creditoDiasApos}
                        onChange={(e) => setCreditoDiasApos(e.target.value)}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Data da Contratação</label>
                  <input
                    type="date"
                    value={creditoDataContratacao}
                    onChange={(e) => setCreditoDataContratacao(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                  Descrição / Motivo
                </label>
                <input
                  type="text"
                  placeholder="Ex.: Capital de giro para compra de máquinas pantográficas"
                  value={creditoDescricao}
                  onChange={(e) => setCreditoDescricao(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalCredito(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCredito}
                  className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-violet-500 active:scale-95"
                >
                  {savingCredito ? "Gerando Parcelas..." : "Criar Crédito & Parcelas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes / Simulação de Amortização do Crédito */}
      {creditoDetalheId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-violet-600" />
                  {creditoDetalheData ? `${creditoDetalheData.fornecedorNome} — Simulação de Amortização` : "Carregando..."}
                </h2>
                <p className="text-xs text-zinc-500">
                  Veja a decomposição de cada parcela entre capital e juros para decidir sobre amortização antecipada
                </p>
              </div>
              <button
                onClick={() => setCreditoDetalheId(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDetalhe || !creditoDetalheData ? (
              <div className="py-12 text-center text-sm text-zinc-400">
                Calculando simulação de amortização...
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {/* Resumo do Crédito */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <p className="text-[10px] uppercase font-bold text-zinc-500">Valor Original</p>
                    <p className="text-base font-black text-zinc-900 dark:text-white">
                      {formatBRL(creditoDetalheData.valorOriginal)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-950 dark:bg-violet-950/20">
                    <p className="text-[10px] uppercase font-bold text-violet-600">Taxa ao Mês</p>
                    <p className="text-base font-black text-violet-700 dark:text-violet-300">
                      {creditoDetalheData.taxaMes != null ? `${(Number(creditoDetalheData.taxaMes) * 100).toFixed(2)}% a.m.` : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <p className="text-[10px] uppercase font-bold text-zinc-500">Progresso Pago</p>
                    <p className="text-base font-black text-zinc-900 dark:text-white">
                      {creditoDetalheData.parcelas?.filter((p: any) => p.status === "pago").length || 0} / {creditoDetalheData.numParcelas}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-950 dark:bg-emerald-950/20">
                    <p className="text-[10px] uppercase font-bold text-emerald-700">Saldo Capital Restante</p>
                    <p className="text-base font-black text-emerald-800 dark:text-emerald-300">
                      {formatBRL(creditoDetalheData.saldoDevedorRestante || 0)}
                    </p>
                  </div>
                </div>

                {/* Tabela de Parcelas com Amortização */}
                <div className="rounded-xl border border-zinc-200 overflow-hidden dark:border-zinc-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60 font-semibold uppercase text-zinc-600 dark:text-zinc-300 text-[10px]">
                        <th className="py-2.5 px-3">Parc.</th>
                        <th className="py-2.5 px-3">Vencimento</th>
                        <th className="py-2.5 px-3">Valor Total</th>
                        <th className="py-2.5 px-3 text-emerald-600">Amortização (Capital)</th>
                        <th className="py-2.5 px-3 text-rose-600">Juros Embutidos</th>
                        <th className="py-2.5 px-3 text-right">Saldo Devedor</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {creditoDetalheData.parcelas?.map((parc: any) => {
                        const isPago = parc.status === "pago";
                        return (
                          <tr
                            key={parc.id}
                            className={`transition ${isPago ? "bg-emerald-50/30 dark:bg-emerald-950/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"}`}
                          >
                            <td className="py-2.5 px-3 font-bold">
                              #{parc.numeroParcela}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {parc.dataVencimento ? formatVencimentoBR(parc.dataVencimento) : "—"}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold">
                              {formatBRL(parc.valor)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              {formatBRL(parc.amortizacaoCapital)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-rose-500 dark:text-rose-400">
                              {formatBRL(parc.jurosEmbutidos)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-right text-zinc-600 dark:text-zinc-400">
                              {formatBRL(parc.saldoDevedorAtual)}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {isPago ? (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Pago
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  <Clock className="h-2.5 w-2.5" /> A Pagar
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-900/40 dark:bg-violet-950/20 text-xs text-violet-800 dark:text-violet-300">
                  <p className="font-bold flex items-center gap-1.5 mb-1">
                    💡 Dica de Amortização
                  </p>
                  <p>
                    Se você antecipar o pagamento das parcelas finais hoje, você economiza os <strong>Juros Embutidos</strong> listados em vermelho acima, pagando apenas a <strong>Amortização (Capital)</strong> daquele período.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
