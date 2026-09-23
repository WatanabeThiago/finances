"use client";

import { useEffect, useState } from "react";
import { Fornecedor, CATEGORIAS_PADRAO } from "@/lib/saida";
import {
  Building2,
  Plus,
  Search,
  CreditCard,
  Calendar,
  Percent,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  FileText,
} from "lucide-react";

export function FornecedoresScreen() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"todos" | "comum" | "credito">("todos");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"comum" | "credito">("comum");
  const [categoria, setCategoria] = useState("Materiais");
  const [taxaMes, setTaxaMes] = useState("");
  const [tipoVencimento, setTipoVencimento] = useState<"dia-fixo" | "d+n">("dia-fixo");
  const [diaVencimento, setDiaVencimento] = useState("10");
  const [diasApos, setDiasApos] = useState("30");
  const [obs, setObs] = useState("");

  const fetchFornecedores = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/fornecedores");
      if (res.ok) {
        setFornecedores(await res.json());
      }
    } catch (err) {
      console.error("Erro ao buscar fornecedores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const handleOpenModal = (f?: Fornecedor) => {
    if (f) {
      setEditingFornecedor(f);
      setNome(f.nome);
      setTipo(f.tipo || "comum");
      setCategoria(f.categoria || "Materiais");
      setTaxaMes(f.taxaMes != null ? String((Number(f.taxaMes) * 100).toFixed(2)) : "");
      setTipoVencimento(f.tipoVencimento || "dia-fixo");
      setDiaVencimento(f.diaVencimento != null ? String(f.diaVencimento) : "10");
      setDiasApos(f.diasApos != null ? String(f.diasApos) : "30");
      setObs(f.obs || "");
    } else {
      setEditingFornecedor(null);
      setNome("");
      setTipo("comum");
      setCategoria("Materiais");
      setTaxaMes("");
      setTipoVencimento("dia-fixo");
      setDiaVencimento("10");
      setDiasApos("30");
      setObs("");
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert("Por favor, informe o nome do fornecedor.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        nome: nome.trim(),
        tipo,
        categoria,
        taxaMes: tipo === "credito" && taxaMes ? parseFloat(taxaMes) / 100 : null,
        tipoVencimento,
        diaVencimento: tipoVencimento === "dia-fixo" ? parseInt(diaVencimento) : null,
        diasApos: tipoVencimento === "d+n" ? parseInt(diasApos) : null,
        obs: obs.trim(),
      };

      let res;
      if (editingFornecedor) {
        res = await fetch(`/api/fornecedores/${editingFornecedor.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/fornecedores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        await fetchFornecedores();
        setModalOpen(false);
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao salvar fornecedor.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao comunicar com o servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, fNome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o fornecedor "${fNome}"?`)) return;

    try {
      const res = await fetch(`/api/fornecedores/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFornecedores((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert("Erro ao excluir fornecedor.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredFornecedores = fornecedores.filter((f) => {
    const matchSearch =
      f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.categoria && f.categoria.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.obs && f.obs.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchTipo = tipoFilter === "todos" || f.tipo === tipoFilter;

    return matchSearch && matchTipo;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
              <Building2 className="h-5 w-5" />
            </span>
            Fornecedores
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Cadastro de parceiros comerciais, taxas de crédito e prazos de pagamento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFornecedores}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-violet-600/20 hover:bg-violet-500 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Novo Fornecedor
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Total Cadastrados
          </p>
          <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-white">
            {fornecedores.length}
          </p>
          <p className="mt-1 text-xs text-zinc-400">Parceiros mapeados</p>
        </div>

        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm dark:border-violet-950 dark:bg-violet-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400">
              Fornecedores de Crédito
            </p>
            <CreditCard className="h-4 w-4 text-violet-600" />
          </div>
          <p className="mt-1 text-2xl font-black text-violet-800 dark:text-violet-300">
            {fornecedores.filter((f) => f.tipo === "credito").length}
          </p>
          <p className="mt-1 text-xs text-violet-600/80">Empréstimos / Financiamentos</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-950 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Fornecedores Comuns
            </p>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-2xl font-black text-emerald-800 dark:text-emerald-300">
            {fornecedores.filter((f) => f.tipo !== "credito").length}
          </p>
          <p className="mt-1 text-xs text-emerald-600/80">Produtos e Serviços</p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nome, categoria ou obs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2 text-xs font-medium text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setTipoFilter("todos")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              tipoFilter === "todos"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setTipoFilter("credito")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
              tipoFilter === "credito"
                ? "bg-violet-600 text-white shadow"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <CreditCard className="h-3 w-3" /> Crédito
          </button>
          <button
            onClick={() => setTipoFilter("comum")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
              tipoFilter === "comum"
                ? "bg-emerald-600 text-white shadow"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Building2 className="h-3 w-3" /> Comum
          </button>
        </div>
      </div>

      {/* Tabela de Fornecedores */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Fornecedor</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Categoria Padrão</th>
                <th className="py-3 px-4">Taxa / Mês</th>
                <th className="py-3 px-4">Prazo / Vencimento</th>
                <th className="py-3 px-4">Observações</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredFornecedores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400">
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              ) : (
                filteredFornecedores.map((f) => {
                  const isCredito = f.tipo === "credito";
                  return (
                    <tr
                      key={f.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition"
                    >
                      {/* Nome */}
                      <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{f.nome}</span>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isCredito ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                            <CreditCard className="h-3 w-3" /> Crédito
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            <Building2 className="h-3 w-3" /> Comum
                          </span>
                        )}
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                        {f.categoria || "—"}
                      </td>

                      {/* Taxa Mês */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {f.taxaMes != null ? (
                          <span className="font-bold text-violet-600 dark:text-violet-400">
                            {(Number(f.taxaMes) * 100).toFixed(2)}% a.m.
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Vencimento */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                        {f.tipoVencimento === "d+n" ? (
                          <span className="inline-flex items-center gap-1 text-zinc-800 dark:text-zinc-200 font-semibold">
                            <Clock className="h-3 w-3 text-amber-500" />
                            D+{f.diasApos || 30} dias
                          </span>
                        ) : f.diaVencimento ? (
                          <span className="inline-flex items-center gap-1 text-zinc-800 dark:text-zinc-200 font-semibold">
                            <Calendar className="h-3 w-3 text-indigo-500" />
                            Dia {f.diaVencimento} de cada mês
                          </span>
                        ) : (
                          <span className="text-zinc-400">A definir</span>
                        )}
                      </td>

                      {/* Observações */}
                      <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate">
                        {f.obs || "—"}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenModal(f)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            title="Editar"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(f.id, f.nome)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-violet-600" />
                {editingFornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                  Nome do Fornecedor / Credor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: MercadoPago, Gold Floripa, PADO, Stam..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                    Tipo
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as "comum" | "credito")}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="comum">🏢 Comum (Peças, etc.)</option>
                    <option value="credito">💳 Crédito / Empréstimo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                    Categoria Padrão
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    {CATEGORIAS_PADRAO.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icone} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Taxa ao Mês — apenas se tipo for Crédito */}
              {tipo === "credito" && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3.5 dark:border-violet-900/40 dark:bg-violet-950/20">
                  <label className="block text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400 mb-1">
                    Taxa de Juros ao Mês (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex.: 3.98"
                      value={taxaMes}
                      onChange={(e) => setTaxaMes(e.target.value)}
                      className="w-full rounded-xl border border-violet-300 bg-white py-2 pl-3.5 pr-8 text-sm font-bold text-violet-900 dark:border-violet-700 dark:bg-zinc-950 dark:text-violet-100"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-violet-500">
                      % a.m.
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-violet-600 dark:text-violet-400">
                    Será pré-preenchido ao registrar empréstimos com este fornecedor
                  </p>
                </div>
              )}

              {/* Regra de Vencimento */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Regra de Vencimento Padrão
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Formato</label>
                    <select
                      value={tipoVencimento}
                      onChange={(e) => setTipoVencimento(e.target.value as "dia-fixo" | "d+n")}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    >
                      <option value="dia-fixo">📅 Dia Fixo do Mês</option>
                      <option value="d+n">⏱️ D+N Dias (Prazo)</option>
                    </select>
                  </div>

                  {tipoVencimento === "dia-fixo" ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Dia do Vencimento</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={diaVencimento}
                        onChange={(e) => setDiaVencimento(e.target.value)}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        placeholder="Ex.: 10, 15, 20"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Dias de Prazo (D+)</label>
                      <input
                        type="number"
                        min="1"
                        value={diasApos}
                        onChange={(e) => setDiasApos(e.target.value)}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        placeholder="Ex.: 30, 45, 60"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações de contato, limite de crédito, chave pix, etc."
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-violet-500 active:scale-95"
                >
                  {submitting ? "Salvando..." : "Salvar Fornecedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
