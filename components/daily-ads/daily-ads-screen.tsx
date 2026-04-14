"use client";

import { formatBRL } from "@/lib/money";
import type { DailyAds } from "@/lib/daily-ads";
import type { VendaLg } from "@/lib/venda-lg";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

type FormState = {
  data: string;
  entradaReal: string;
  gastosGoogleAds: string;
  clientes: string;
  cac: string;
  ticketMedio: string;
  cpc: string;
  resultado: string;
  comissao: string;
  resultadoComissao: string;
};

const emptyForm = (): FormState => ({
  data: new Date().toISOString().split("T")[0],
  entradaReal: "",
  gastosGoogleAds: "",
  clientes: "",
  cac: "",
  ticketMedio: "",
  cpc: "",
  resultado: "",
  comissao: "",
  resultadoComissao: "",
});

type ModalMode = "create" | "edit";

export function DailyAdsScreen() {
  const [dailyAds, setDailyAds] = useState<DailyAds[]>([]);
  const [vendas, setVendas] = useState<VendaLg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [adsRes, vendasRes] = await Promise.all([
          fetch("/api/daily-ads"),
          fetch("/api/vendas-lg"),
        ]);
        if (!adsRes.ok) throw new Error("Falha ao carregar dados de ads");
        if (!vendasRes.ok) throw new Error("Falha ao carregar dados de vendas");
        
        const adsData = await adsRes.json();
        const vendasData = await vendasRes.json();
        
        // Normalize numeric values for daily ads
        const normalized = adsData.map((d: any) => ({
          ...d,
          entradaReal: typeof d.entradaReal === "string" ? parseFloat(d.entradaReal) : d.entradaReal,
          gastosGoogleAds: typeof d.gastosGoogleAds === "string" ? parseFloat(d.gastosGoogleAds) : d.gastosGoogleAds,
          clientes: typeof d.clientes === "string" ? parseInt(d.clientes, 10) : d.clientes,
          cac: typeof d.cac === "string" ? parseFloat(d.cac) : d.cac,
          ticketMedio: typeof d.ticketMedio === "string" ? parseFloat(d.ticketMedio) : d.ticketMedio,
          cpc: typeof d.cpc === "string" ? parseFloat(d.cpc) : d.cpc,
          resultado: typeof d.resultado === "string" ? parseFloat(d.resultado) : d.resultado,
          comissao: typeof d.comissao === "string" ? parseFloat(d.comissao) : d.comissao,
          resultadoComissao: typeof d.resultadoComissao === "string" ? parseFloat(d.resultadoComissao) : d.resultadoComissao,
        }));
        
        // Normalize numeric values for vendas
        const normalizedVendas = vendasData.map((v: any) => ({
          ...v,
          comissao: typeof v.comissao === "string" ? parseFloat(v.comissao) : v.comissao,
          linhas: Array.isArray(v.linhas) ? v.linhas.map((l: any) => ({
            ...l,
            preco: typeof l.preco === "string" ? parseFloat(l.preco) : l.preco,
            quantidade: typeof l.quantidade === "string" ? parseInt(l.quantidade, 10) : l.quantidade,
          })) : [],
        }));
        
        setDailyAds(normalized);
        setVendas(normalizedVendas);
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const titleId = useId();

  // Helper function to calculate derived fields
  const calculateDerivedFields = useCallback((entrada: number, gastos: number, clientes: number) => {
    const cac = clientes > 0 ? gastos / clientes : 0;
    const ticketMedio = clientes > 0 ? entrada / clientes : 0;
    const resultado = entrada - gastos;
    
    return { 
      cac: cac.toFixed(2), 
      ticketMedio: ticketMedio.toFixed(2),
      resultado: resultado.toFixed(2)
    };
  }, []);

  const openModal = useCallback((recordToEdit?: DailyAds) => {
    setModalMode("create");
    setEditingId(null);
    setFormError(null);
    if (recordToEdit) {
      setModalMode("edit");
      setEditingId(recordToEdit.id);
      setForm({
        data: recordToEdit.data,
        entradaReal: recordToEdit.entradaReal.toString(),
        gastosGoogleAds: recordToEdit.gastosGoogleAds.toString(),
        clientes: recordToEdit.clientes.toString(),
        cac: recordToEdit.cac.toString(),
        ticketMedio: recordToEdit.ticketMedio.toString(),
        cpc: recordToEdit.cpc.toString(),
        resultado: recordToEdit.resultado.toString(),
        comissao: recordToEdit.comissao?.toString() || "",
        resultadoComissao: recordToEdit.resultadoComissao?.toString() || "",
      });
    } else {
      setForm(emptyForm());
    }
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setFormError(null);
    setEditingId(null);
    setModalMode("create");
  }, []);

  // Auto-fill entrada real and clientes based on sales for the selected date (GMT-4)
  useEffect(() => {
    if (!modalOpen || !form.data || vendas.length === 0 || modalMode === "edit") return;

    const selectedDate = form.data; // Format: YYYY-MM-DD
    let totalEntrada = 0;
    let numClientes = 0;

    vendas.forEach((v) => {
      if (!v.dataVenda) return;

      // Convert sale date to GMT-4
      const saleDateTime = new Date(v.dataVenda);
      // Adjust to GMT-4 by subtracting 4 hours from current timezone offset
      const offsetMs = saleDateTime.getTimezoneOffset() * 60 * 1000;
      const gmt4AdjustedTime = saleDateTime.getTime() + offsetMs - (4 * 60 * 60 * 1000);
      const adjustedDate = new Date(gmt4AdjustedTime);
      const saleDateString = adjustedDate.toISOString().split("T")[0];

      if (saleDateString === selectedDate) {
        // Sum up line item totals
        v.linhas.forEach((l) => {
          totalEntrada += l.preco * l.quantidade;
        });
        numClientes++;
      }
    });

    // Update form with calculated values
    const gastos = parseFloat(form.gastosGoogleAds) || 0;
    const derived = calculateDerivedFields(totalEntrada, gastos, numClientes);
    
    setForm((f) => ({
      ...f,
      entradaReal: totalEntrada.toFixed(2),
      clientes: numClientes.toString(),
      ...derived,
    }));
  }, [form.data, vendas, modalOpen, modalMode, calculateDerivedFields]);

  const submit = useCallback(async () => {
    setFormError(null);

    if (!form.data.trim()) {
      setFormError("Data é obrigatória");
      return;
    }

    const url = modalMode === "edit" ? `/api/daily-ads/${editingId}` : "/api/daily-ads";
    const method = modalMode === "edit" ? "PUT" : "POST";

    setSubmitting(true);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: form.data,
          entradaReal: parseFloat(form.entradaReal) || 0,
          gastosGoogleAds: parseFloat(form.gastosGoogleAds) || 0,
          clientes: parseInt(form.clientes, 10) || 0,
          cac: parseFloat(form.cac) || 0,
          ticketMedio: parseFloat(form.ticketMedio) || 0,
          cpc: parseFloat(form.cpc) || 0,
          resultado: parseFloat(form.resultado) || 0,
          comissao: parseFloat(form.comissao) || 0,
          resultadoComissao: parseFloat(form.resultadoComissao) || 0,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao salvar");
      }

      // Refresh data
      const refreshResponse = await fetch("/api/daily-ads");
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const normalized = data.map((d: any) => ({
          ...d,
          entradaReal: typeof d.entradaReal === "string" ? parseFloat(d.entradaReal) : d.entradaReal,
          gastosGoogleAds: typeof d.gastosGoogleAds === "string" ? parseFloat(d.gastosGoogleAds) : d.gastosGoogleAds,
          clientes: typeof d.clientes === "string" ? parseInt(d.clientes, 10) : d.clientes,
          cac: typeof d.cac === "string" ? parseFloat(d.cac) : d.cac,
          ticketMedio: typeof d.ticketMedio === "string" ? parseFloat(d.ticketMedio) : d.ticketMedio,
          cpc: typeof d.cpc === "string" ? parseFloat(d.cpc) : d.cpc,
          resultado: typeof d.resultado === "string" ? parseFloat(d.resultado) : d.resultado,
          comissao: typeof d.comissao === "string" ? parseFloat(d.comissao) : d.comissao,
          resultadoComissao: typeof d.resultadoComissao === "string" ? parseFloat(d.resultadoComissao) : d.resultadoComissao,
        }));
        setDailyAds(normalized);
      }

      closeModal();
    } catch (err) {
      console.error("Error submitting:", err);
      setFormError("Erro ao salvar registro");
    } finally {
      setSubmitting(false);
    }
  }, [form, modalMode, editingId, closeModal]);

  const deleteRecord = useCallback(
    async (id: string) => {
      if (!confirm("Tem certeza que quer deletar este registro?")) return;

      try {
        const response = await fetch(`/api/daily-ads/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Falha ao deletar");
        }

        setDailyAds((prev) => prev.filter((d) => d.id !== id));
      } catch (err) {
        console.error("Error deleting:", err);
        setError("Erro ao deletar registro");
      }
    },
    []
  );

  const stats = useMemo(() => {
    if (dailyAds.length === 0) {
      return {
        totalGastos: 0,
        totalEntrada: 0,
        totalClientes: 0,
        avgROI: 0,
        avgCAC: 0,
        totalComissao: 0,
        comissaoMedia: 0,
        lucroLiquido: 0,
        avgTicketMedio: 0,
        avgCpc: 0,
        resultadoComissao: 0,
      };
    }

    const totalGastos = dailyAds.reduce((acc, d) => acc + d.gastosGoogleAds, 0);
    const totalEntrada = dailyAds.reduce((acc, d) => acc + d.entradaReal, 0);
    const totalClientes = dailyAds.reduce((acc, d) => acc + d.clientes, 0);
    const roi = ((totalEntrada - totalGastos) / totalGastos) * 100;
    const avgCAC = dailyAds.reduce((acc, d) => acc + d.cac, 0) / dailyAds.length;
    const totalComissao = vendas.reduce((acc, v) => acc + (v.comissao || 0), 0);
    
    // New metrics
    const vendasComComissao = vendas.filter((v) => v.comissao && v.comissao > 0);
    const comissaoMedia = vendasComComissao.length > 0 
      ? totalComissao / vendasComComissao.length 
      : 0;
    const lucroLiquido = totalEntrada - totalGastos;
    const avgTicketMedio = dailyAds.reduce((acc, d) => acc + d.ticketMedio, 0) / dailyAds.length;
    const avgCpc = dailyAds.reduce((acc, d) => acc + d.cpc, 0) / dailyAds.length;
    const resultadoComissao = totalComissao - totalGastos;

    return {
      totalGastos,
      totalEntrada,
      totalClientes,
      avgROI: isFinite(roi) ? roi : 0,
      avgCAC,
      totalComissao,
      comissaoMedia,
      lucroLiquido,
      avgTicketMedio,
      avgCpc: isFinite(avgCpc) ? avgCpc : 0,
      resultadoComissao,
    };
  }, [dailyAds, vendas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-500">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-zinc-50 p-4 dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">
            Controle de Google Ads
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Acompanhe seus gastos diários e ROI
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Entrada Total */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Entrada Total
            </p>
            <p className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">
              {formatBRL(stats.totalEntrada)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {stats.totalClientes} cliente{stats.totalClientes !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Gasto Total */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Gasto Google Ads
            </p>
            <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
              {formatBRL(stats.totalGastos)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Gastos totais
            </p>
          </div>

          {/* Lucro Líquido */}
          <div className={`rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 ${stats.lucroLiquido >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Lucro Líquido
            </p>
            <p className={`mt-2 text-2xl font-bold ${stats.lucroLiquido >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatBRL(stats.lucroLiquido)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Entrada - Gasto
            </p>
          </div>

          {/* ROI Médio */}
          <div className={`rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 ${stats.avgROI >= 0 ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              ROI Médio
            </p>
            <p className={`mt-2 text-2xl font-bold ${stats.avgROI >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
              {stats.avgROI.toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Retorno sobre investimento
            </p>
          </div>

          {/* Ticket Médio */}
          <div className="rounded-xl border border-zinc-200 bg-sky-50 p-4 dark:border-zinc-800 dark:bg-sky-950/30">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Ticket Médio
            </p>
            <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
              {formatBRL(stats.avgTicketMedio)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Por cliente
            </p>
          </div>

          {/* CAC Médio */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              CAC Médio
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
              {formatBRL(stats.avgCAC)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Custo por cliente
            </p>
          </div>

          {/* CPC Médio */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              CPC Médio
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
              {formatBRL(stats.avgCpc)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Custo por clique
            </p>
          </div>

          {/* Comissão Total */}
          <div className="rounded-xl border border-zinc-200 bg-violet-50 p-4 dark:border-zinc-800 dark:bg-violet-950/30">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Comissão Total
            </p>
            <p className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400">
              {formatBRL(stats.totalComissao)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Total a pagar
            </p>
          </div>

          {/* Comissão Média */}
          <div className="rounded-xl border border-zinc-200 bg-indigo-50 p-4 dark:border-zinc-800 dark:bg-indigo-950/30">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Comissão Média
            </p>
            <p className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatBRL(stats.comissaoMedia)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Por venda
            </p>
          </div>

          {/* Resultado Comissão */}
          <div className={`rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 ${stats.resultadoComissao >= 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-orange-50 dark:bg-orange-950/30'}`}>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Resultado Comissão
            </p>
            <p className={`mt-2 text-2xl font-bold ${stats.resultadoComissao >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {formatBRL(stats.resultadoComissao)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Comissão - Gasto
            </p>
          </div>
        </div>

        {/* Button */}
        <div className="mb-6">
          <button
            onClick={() => openModal()}
            className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
          >
            + Adicionar Registro
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                  Data
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-900 dark:text-white">
                  Entrada Real
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-900 dark:text-white">
                  Gasto G Ads
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-zinc-900 dark:text-white">
                  Clientes
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-900 dark:text-white">
                  CAC
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-900 dark:text-white">
                  Ticket Médio
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-900 dark:text-white">
                  CPC
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-900 dark:text-white">
                  Resultado
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-900 dark:text-white">
                  Resultado Comissão
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-zinc-900 dark:text-white">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {dailyAds.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                    {new Date(d.data).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatBRL(d.entradaReal)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-red-600 dark:text-red-400">
                    {formatBRL(d.gastosGoogleAds)}
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {d.clientes}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-zinc-600 dark:text-zinc-400">
                    {formatBRL(d.cac)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-zinc-600 dark:text-zinc-400">
                    {formatBRL(d.ticketMedio)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-zinc-600 dark:text-zinc-400">
                    {formatBRL(d.cpc)}
                  </td>
                  <td className={`px-6 py-4 text-right text-sm font-semibold ${d.resultado >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatBRL(d.resultado)}
                  </td>
                  <td className={`px-6 py-4 text-right text-sm font-semibold text-violet-600 dark:text-violet-400`}>
                    {formatBRL(d.resultadoComissao)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openModal(d)}
                      className="mr-2 rounded p-1 text-zinc-400 hover:bg-sky-100 hover:text-sky-600 dark:hover:bg-sky-950 dark:hover:text-sky-400"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteRecord(d.id)}
                      className="rounded p-1 text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-4xl rounded-xl bg-white dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {modalMode === "create" ? "Novo Registro" : "Editar Registro"}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
                {formError && (
                  <div className="col-span-1 md:col-span-2 lg:col-span-4 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
                    {formError}
                  </div>
                )}

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Data
                  </span>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, data: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Entrada Real (R$)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.entradaReal}
                    onChange={(e) => {
                      const entrada = parseFloat(e.target.value) || 0;
                      const gastos = parseFloat(form.gastosGoogleAds) || 0;
                      const clientes = parseInt(form.clientes, 10) || 0;
                      const derived = calculateDerivedFields(entrada, gastos, clientes);
                      setForm((f) => ({ 
                        ...f, 
                        entradaReal: e.target.value,
                        ...derived
                      }));
                    }}
                    className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Gasto Google Ads (R$)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.gastosGoogleAds}
                    onChange={(e) => {
                      const entrada = parseFloat(form.entradaReal) || 0;
                      const gastos = parseFloat(e.target.value) || 0;
                      const clientes = parseInt(form.clientes, 10) || 0;
                      const comissao = parseFloat(form.comissao) || 0;
                      const derived = calculateDerivedFields(entrada, gastos, clientes);
                      const resultadoComissao = (comissao - gastos).toFixed(2);
                      setForm((f) => ({ 
                        ...f, 
                        gastosGoogleAds: e.target.value,
                        ...derived,
                        resultadoComissao
                      }));
                    }}
                    className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Clientes
                  </span>
                  <input
                    type="number"
                    value={form.clientes}
                    onChange={(e) => {
                      const entrada = parseFloat(form.entradaReal) || 0;
                      const gastos = parseFloat(form.gastosGoogleAds) || 0;
                      const clientes = parseInt(e.target.value, 10) || 0;
                      const derived = calculateDerivedFields(entrada, gastos, clientes);
                      setForm((f) => ({ 
                        ...f, 
                        clientes: e.target.value,
                        ...derived
                      }));
                    }}
                    className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    CAC (R$)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.cac}
                    disabled
                    readOnly
                    className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2.5 cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Calculado automaticamente</p>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Ticket Médio (R$)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.ticketMedio}
                    disabled
                    readOnly
                    className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2.5 cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Calculado automaticamente</p>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    CPC (R$)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.cpc}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cpc: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    placeholder="0,00"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Resultado (R$)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.resultado}
                    disabled
                    readOnly
                    className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2.5 cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Calculado automaticamente</p>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Comissão (R$)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.comissao}
                    onChange={(e) => {
                      const comissao = parseFloat(e.target.value) || 0;
                      const gastos = parseFloat(form.gastosGoogleAds) || 0;
                      const resultadoComissao = (comissao - gastos).toFixed(2);
                      setForm((f) => ({ 
                        ...f, 
                        comissao: e.target.value,
                        resultadoComissao
                      }));
                    }}
                    className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    placeholder="0,00"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Resultado Comissão (R$)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.resultadoComissao}
                    disabled
                    readOnly
                    className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2.5 cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Calculado automaticamente (Comissão - Gasto Google Ads)</p>
                </label>
              </div>

              <div className="flex gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <button
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-700 dark:hover:bg-sky-600"
                >
                  {submitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
