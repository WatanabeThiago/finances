"use client";

import { useEffect, useState, useCallback } from "react";
import { formatBRL } from "@/lib/money";
import type { FinanceiroData, ItemDinheiroNaRua } from "./types";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Megaphone,
  Check,
  RefreshCw,
  SlidersHorizontal,
  Calendar,
  ExternalLink,
  Info,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";

const MESES = [
  { valor: 1, nome: "Janeiro" },
  { valor: 2, nome: "Fevereiro" },
  { valor: 3, nome: "Março" },
  { valor: 4, nome: "Abril" },
  { valor: 5, nome: "Maio" },
  { valor: 6, nome: "Junho" },
  { valor: 7, nome: "Julho" },
  { valor: 8, nome: "Agosto" },
  { valor: 9, nome: "Setembro" },
  { valor: 10, nome: "Outubro" },
  { valor: 11, nome: "Novembro" },
  { valor: 12, nome: "Dezembro" },
];

export function FinanceiroScreen() {
  const now = new Date();
  const [mes, setMes] = useState<number>(now.getMonth() + 1);
  const [ano, setAno] = useState<number>(now.getFullYear());
  const [aliquota, setAliquota] = useState<number>(6.0);
  const [diasGiro, setDiasGiro] = useState<number>(30);
  const [saldoCaixaInput, setSaldoCaixaInput] = useState<string>("");
  const [saldoCaixa, setSaldoCaixa] = useState<number>(0);

  const [data, setData] = useState<FinanceiroData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filtroAba, setFiltroAba] = useState<"geral" | "giro" | "dre" | "pendencias">("geral");

  // Carregar saldo em caixa do localStorage na inicialização
  useEffect(() => {
    try {
      const salvo = localStorage.getItem("finances.saldoCaixa");
      if (salvo) {
        const num = parseFloat(salvo);
        if (!isNaN(num)) {
          setSaldoCaixa(num);
          setSaldoCaixaInput(num.toString());
        }
      }
    } catch {}
  }, []);

  const handleSalvarSaldoCaixa = (valorStr: string) => {
    setSaldoCaixaInput(valorStr);
    const num = parseFloat(valorStr.replace(",", "."));
    const finalVal = isNaN(num) ? 0 : num;
    setSaldoCaixa(finalVal);
    try {
      localStorage.setItem("finances.saldoCaixa", finalVal.toString());
    } catch {}
  };

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        mes: mes.toString(),
        ano: ano.toString(),
        aliquota: aliquota.toString(),
        diasGiro: diasGiro.toString(),
      });

      const res = await fetch(`/api/financeiro?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar dados financeiros");
      const json: FinanceiroData = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [mes, ano, aliquota, diasGiro]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Ação rápida para marcar comissão como paga diretamente
  const marcarComissaoComoPaga = async (vendaId: string) => {
    try {
      setUpdatingId(vendaId);
      const res = await fetch(`/api/vendas-lg/${vendaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comissaoPaga: true }),
      });

      if (res.ok) {
        // Recarregar dados após atualização
        await carregarDados();
      } else {
        alert("Não foi possível atualizar o status da comissão.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão ao atualizar a comissão.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Cálculo de cobertura de caixa do usuário
  const custoDiario = data?.capitalDeGiro?.custoDiarioSobrevivencia || 1;
  const diasDeCaixaDisponiveis = saldoCaixa > 0 ? Math.floor(saldoCaixa / custoDiario) : 0;
  const capitalRecomendado = data?.capitalDeGiro?.capitalDeGiroRecomendado || 0;
  const deficitSuperavit = saldoCaixa - capitalRecomendado;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-12">
      {/* 1. TOPO: Título, Filtros de Período e Configuração */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Torre de Controle Financeiro
            </h1>
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Simples Nacional • Lead Gen
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Inteligência de caixa baseada na sua receita real (comissões), ponto de equilíbrio e capital de giro.
          </p>
        </div>

        {/* Controles de Período e Recarga */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Mês */}
          <div className="relative">
            <select
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value, 10))}
              className="h-9 rounded-lg border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {MESES.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Ano */}
          <div className="relative">
            <select
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value, 10))}
              className="h-9 rounded-lg border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Botão Mês Atual rápido */}
          <button
            type="button"
            onClick={() => {
              setMes(now.getMonth() + 1);
              setAno(now.getFullYear());
            }}
            className="h-9 rounded-lg border border-zinc-200 bg-zinc-100 px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Mês Atual
          </button>

          {/* Botão Recarregar */}
          <button
            type="button"
            onClick={() => carregarDados()}
            disabled={loading}
            title="Recarregar dados"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-sky-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. BARRA DE AJUSTES E SALDO EM BANCO */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        {/* Input: Saldo Real em Banco */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Meu Saldo Bancário Atual
            </span>
            <Wallet className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-500">R$</span>
            <input
              type="number"
              step="0.01"
              value={saldoCaixaInput}
              onChange={(e) => handleSalvarSaldoCaixa(e.target.value)}
              placeholder="0,00"
              className="w-full text-xl font-bold tracking-tight text-zinc-900 focus:outline-none dark:text-white dark:bg-transparent"
            />
          </div>
          <p className="mt-1 text-[11px] text-zinc-400">
            Salvo localmente para medir seus dias de sobrevivência.
          </p>
        </div>

        {/* Ajuste de Alíquota Simples Nacional */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Alíquota Estimada do Simples
            </span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {aliquota.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {[4, 6, 8, 10].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setAliquota(rate)}
                className={`flex-1 rounded-lg py-1 text-xs font-semibold transition ${
                  aliquota === rate
                    ? "bg-indigo-600 text-white shadow-sm dark:bg-indigo-500"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {rate}%
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-zinc-400">
            Incide exclusivamente sobre as comissões geradas.
          </p>
        </div>

        {/* Ajuste de Margem de Segurança do Giro */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Reserva de Segurança do Giro
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {diasGiro} dias
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {[15, 30, 45, 60].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiasGiro(d)}
                className={`flex-1 rounded-lg py-1 text-xs font-semibold transition ${
                  diasGiro === d
                    ? "bg-amber-600 text-white shadow-sm dark:bg-amber-500"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-zinc-400">
            Garante fôlego para Ads, contas e atraso de repasse.
          </p>
        </div>
      </div>

      {/* 3. ALERTA DE SAÚDE IMEDIATA / UTI FINANCEIRA */}
      {data && (
        <div
          className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border p-4 shadow-sm ${
            diasDeCaixaDisponiveis < 15 && saldoCaixa > 0
              ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
              : diasDeCaixaDisponiveis < 30 && saldoCaixa > 0
              ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              : saldoCaixa === 0
              ? "border-zinc-300 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {diasDeCaixaDisponiveis < 15 && saldoCaixa > 0 ? (
                <ShieldAlert className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              ) : diasDeCaixaDisponiveis < 30 && saldoCaixa > 0 ? (
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div>
              <p className="font-bold text-sm md:text-base">
                {saldoCaixa === 0
                  ? "Informe seu saldo bancário acima para calibrar o diagnóstico de sobrevivência"
                  : diasDeCaixaDisponiveis < 15
                  ? `🚨 ALERTA CRÍTICO: Seu caixa atual cobre apenas ${diasDeCaixaDisponiveis} dias de operação!`
                  : diasDeCaixaDisponiveis < 30
                  ? `⚠️ ATENÇÃO: Seu caixa atual cobre ${diasDeCaixaDisponiveis} dias. Meta de segurança recomendada é de ${diasGiro} dias.`
                  : `✅ CAIXA PROTEGIDO: Seu saldo cobre ${diasDeCaixaDisponiveis} dias de operação contínua.`}
              </p>
              <p className="mt-0.5 text-xs opacity-85">
                Custo diário de sobrevivência da sua máquina (Google Ads + Contas):{" "}
                <span className="font-semibold">{formatBRL(custoDiario)}/dia</span>.
                {deficitSuperavit < 0 ? (
                  <span className="ml-1 font-bold underline">
                    Déficit de capital de giro: {formatBRL(Math.abs(deficitSuperavit))}.
                  </span>
                ) : saldoCaixa > 0 ? (
                  <span className="ml-1 font-bold">
                    Superávit de reserva: +{formatBRL(deficitSuperavit)}.
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-75">
              Capital Recomendado:
            </span>
            <span className="rounded-lg bg-black/10 dark:bg-white/10 px-3 py-1 font-mono font-bold text-sm">
              {formatBRL(capitalRecomendado)}
            </span>
          </div>
        </div>
      )}

      {/* 4. OS 4 CARDS DE DIAGNÓSTICO IMEDIATO */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Sua Receita Real (Comissão Líquida) */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Sua Receita Real (Comissões)
            </span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-zinc-900 dark:text-white">
            {formatBRL(data?.resumoVendas?.comissaoBrutaTotal || 0)}
          </p>
          <div className="mt-2 flex flex-col gap-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex justify-between">
              <span>(-) Provisão Simples ({aliquota}%):</span>
              <span className="font-semibold text-rose-500">
                -{formatBRL(data?.tributos?.provisaoSimplesNacional || 0)}
              </span>
            </div>
            <div className="flex justify-between font-medium text-zinc-700 dark:text-zinc-300">
              <span>(=) Comissão Líquida:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatBRL(data?.tributos?.comissaoLiquidaImposto || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Google Ads & ROAS */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Google Ads & Eficiência
            </span>
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
              <Megaphone className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-zinc-900 dark:text-white">
            {formatBRL(data?.googleAds?.totalGastoAds || 0)}
          </p>
          <div className="mt-2 flex flex-col gap-0.5 text-xs">
            <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
              <span>Média diária de Ads:</span>
              <span className="font-semibold">{formatBRL(data?.googleAds?.mediaDiariaAds || 0)}/dia</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>ROAS Real (Comissão/Ads):</span>
              <span
                className={`font-bold ${
                  (data?.googleAds?.roasReal || 0) >= 2
                    ? "text-emerald-600 dark:text-emerald-400"
                    : (data?.googleAds?.roasReal || 0) >= 1
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {(data?.googleAds?.roasReal || 0).toFixed(2)}x
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Custos Fixos & Saídas */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Custos Fixos & Saídas
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-zinc-900 dark:text-white">
            {formatBRL(data?.custosOperacionais?.totalDespesasOperacionais || 0)}
          </p>
          <div className="mt-2 flex flex-col gap-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex justify-between">
              <span>Contas Fixas do Mês:</span>
              <span className="font-semibold">
                {formatBRL(data?.custosOperacionais?.totalContasFixasMes || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Saídas Variáveis Pagas:</span>
              <span className="font-semibold">
                {formatBRL(data?.custosOperacionais?.totalSaidasVariaveisPagas || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Resultado Real Líquido */}
        <div
          className={`rounded-2xl border p-5 shadow-sm ${
            (data?.resultadoReal?.lucroLiquidoReal || 0) >= 0
              ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/20"
              : "border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/20"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Resultado Real no Bolso
            </span>
            <div
              className={`rounded-lg p-2 ${
                (data?.resultadoReal?.lucroLiquidoReal || 0) >= 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
              }`}
            >
              {(data?.resultadoReal?.lucroLiquidoReal || 0) >= 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
            </div>
          </div>
          <p
            className={`mt-3 text-3xl font-black ${
              (data?.resultadoReal?.lucroLiquidoReal || 0) >= 0
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-rose-700 dark:text-rose-300"
            }`}
          >
            {formatBRL(data?.resultadoReal?.lucroLiquidoReal || 0)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs font-semibold">
            <span className="text-zinc-600 dark:text-zinc-400">Margem Líquida Real:</span>
            <span
              className={
                (data?.resultadoReal?.lucroLiquidoReal || 0) >= 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-rose-700 dark:text-rose-400"
              }
            >
              {(data?.resultadoReal?.margemLiquidaRealPercentual || 0).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* 5. PONTO DE EQUILÍBRIO (BREAK-EVEN) - TERMÔMETRO DE METAS */}
      {data && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Ponto de Equilíbrio do Mês (Sua Meta de Sobrevivência)
                </h2>
                {data.pontoEquilibrio.atingido ? (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Meta Atingida! Cada nova comissão é lucro puro
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Faltam {formatBRL(data.pontoEquilibrio.faltaParaAtingir)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Quanto você precisa faturar em comissões no mês só para empatar (zero a zero) com os custos fixos, saídas e anúncios.
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Progresso
              </span>
              <p className="text-2xl font-black text-zinc-900 dark:text-white">
                {data.pontoEquilibrio.progressoPercentual}%
              </p>
            </div>
          </div>

          {/* Barra de Progresso Visual */}
          <div className="mt-4">
            <div className="h-4 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  data.pontoEquilibrio.atingido
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                    : "bg-gradient-to-r from-amber-500 to-sky-500"
                }`}
                style={{ width: `${Math.min(100, data.pontoEquilibrio.progressoPercentual)}%` }}
              />
            </div>
          </div>

          {/* Métricas do Ponto de Equilíbrio */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-zinc-100 pt-4 dark:border-zinc-800 text-xs">
            <div>
              <span className="text-zinc-400">Comissão Necessária:</span>
              <p className="mt-0.5 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                {formatBRL(data.pontoEquilibrio.comissaoNecessaria)}
              </p>
            </div>
            <div>
              <span className="text-zinc-400">Comissão Já Gerada:</span>
              <p className="mt-0.5 font-bold text-sm text-indigo-600 dark:text-indigo-400">
                {formatBRL(data.pontoEquilibrio.comissaoRealizada)}
              </p>
            </div>
            <div>
              <span className="text-zinc-400">Falta para Lucrar:</span>
              <p className={`mt-0.5 font-bold text-sm ${data.pontoEquilibrio.faltaParaAtingir === 0 ? "text-emerald-500" : "text-amber-500"}`}>
                {formatBRL(data.pontoEquilibrio.faltaParaAtingir)}
              </p>
            </div>
            <div>
              <span className="text-zinc-400">Vendas Estimadas Faltantes:</span>
              <p className="mt-0.5 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                {data.pontoEquilibrio.atingido
                  ? "Zero (Objetivo cumprido!)"
                  : `~ ${Math.max(1, Math.ceil(data.pontoEquilibrio.faltaParaAtingir / Math.max(1, data.resumoVendas.comissaoMediaPorVenda)))} serviços`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6. NAVEGAÇÃO POR ABAS: CAPITAL DE GIRO, DRE E DINHEIRO NA RUA */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setFiltroAba("geral")}
          className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
            filtroAba === "geral"
              ? "border-sky-500 text-sky-600 dark:text-sky-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          Visão Geral & Indicadores
        </button>
        <button
          type="button"
          onClick={() => setFiltroAba("giro")}
          className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
            filtroAba === "giro"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          Capital de Giro Detalhado
        </button>
        <button
          type="button"
          onClick={() => setFiltroAba("dre")}
          className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
            filtroAba === "dre"
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          DRE da Operação (Em Cascata)
        </button>
        <button
          type="button"
          onClick={() => setFiltroAba("pendencias")}
          className={`relative border-b-2 px-5 py-3 text-sm font-semibold transition ${
            filtroAba === "pendencias"
              ? "border-rose-500 text-rose-600 dark:text-rose-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          Dinheiro na Rua (Comissões Pendentes)
          {(data?.dinheiroNaRua?.quantidadePendencias || 0) > 0 && (
            <span className="ml-2 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">
              {data?.dinheiroNaRua?.quantidadePendencias}
            </span>
          )}
        </button>
      </div>

      {/* ABA 1: VISÃO GERAL & INDICADORES COMPLEMENTARES */}
      {filtroAba === "geral" && data && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card: Provisão do Simples Nacional */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Provisão do Simples Nacional
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Boleto DAS com vencimento no dia 20 do mês seguinte
                  </p>
                </div>
              </div>
              <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {aliquota}% Alíquota
              </span>
            </div>

            <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Valor para reservar até o dia 20:
              </span>
              <p className="mt-1 text-2xl font-black text-indigo-900 dark:text-indigo-100">
                {formatBRL(data.tributos.provisaoSimplesNacional)}
              </p>
              <p className="mt-2 text-xs text-indigo-800/80 dark:text-indigo-300/80">
                💡 <span className="font-semibold">Regra de ouro:</span> Nunca emita nota pelo valor total transacionado ({formatBRL(data.resumoVendas.faturamentoBrutoTotal)}), pois isso geraria {formatBRL(data.resumoVendas.faturamentoBrutoTotal * (aliquota / 100))} de imposto e comeria 100% da sua comissão!
              </p>
            </div>
          </div>

          {/* Card: Diagnóstico de Eficiência de Tráfego (Google Ads) */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-sky-50 p-2 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Eficiência de Aquisição (CAC & Tráfego)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    O Google Ads está dando lucro ou comendo suas margens?
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                <span className="text-zinc-400">CAC Médio (Custo por Venda):</span>
                <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                  {formatBRL(data.googleAds.cacMedio)}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                <span className="text-zinc-400">Comissão Média por Venda:</span>
                <p className="mt-1 text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {formatBRL(data.resumoVendas.comissaoMediaPorVenda)}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                <span className="text-zinc-400">Margem Líquida por Venda:</span>
                <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatBRL(
                    Math.max(
                      0,
                      data.resumoVendas.comissaoMediaPorVenda * (1 - aliquota / 100) - data.googleAds.cacMedio
                    )
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                <span className="text-zinc-400">Total de Vendas Fechadas:</span>
                <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                  {data.resumoVendas.totalVendasCount} serviços
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CAPITAL DE GIRO DETALHADO */}
      {filtroAba === "giro" && data && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Necessidade de Capital de Giro (NCG)
                </span>
                <h3 className="mt-2 text-2xl font-black text-zinc-900 dark:text-white">
                  Seu Capital de Giro Mínimo: {formatBRL(capitalRecomendado)}
                </h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Este é o montante financeiro exato que a sua empresa precisa ter reservado para manter anúncios rodando, contas pagas em dia e suportar o tempo até os parceiros repassarem as comissões.
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-800/60 dark:bg-zinc-900">
                <span className="text-xs font-semibold uppercase text-zinc-400">
                  Dias de Fôlego Configurados
                </span>
                <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                  {diasGiro} dias
                </p>
              </div>
            </div>

            {/* Decomposição do Capital de Giro */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Reserva Google Ads */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500">1. Reserva Google Ads</span>
                  <Megaphone className="h-4 w-4 text-sky-500" />
                </div>
                <p className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">
                  {formatBRL(data.capitalDeGiro.reservaAds)}
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Garante {diasGiro} dias de campanhas ativas sem estourar o limite de cartão.
                </p>
              </div>

              {/* 2. Reserva Contas Fixas */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500">2. Reserva Contas Fixas</span>
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">
                  {formatBRL(data.capitalDeGiro.reservaCustosFixos)}
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Cobre aluguel, sistemas, celular e ferramentas pelo período.
                </p>
              </div>

              {/* 3. Provisão de Impostos */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500">3. Caixinha do DAS (Dia 20)</span>
                  <Calendar className="h-4 w-4 text-indigo-500" />
                </div>
                <p className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">
                  {formatBRL(data.capitalDeGiro.reservaImpostos)}
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Garante que o imposto não seja gasto com outras despesas.
                </p>
              </div>

              {/* 4. Dinheiro na Rua */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500">4. Dinheiro Travado na Rua</span>
                  <Clock className="h-4 w-4 text-rose-500" />
                </div>
                <p className="mt-2 text-xl font-bold text-rose-600 dark:text-rose-400">
                  {formatBRL(data.capitalDeGiro.dinheiroNaRua)}
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Comissões que você já financiou no Ads e ainda não recebeu do parceiro.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: DRE EM CASCATA */}
      {filtroAba === "dre" && data && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Demonstrativo de Resultado Operacional (DRE)
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              A matemática transparente de para onde foi cada centavo faturado no período.
            </p>
          </div>

          <div className="mt-4 flex flex-col divide-y divide-zinc-100 font-mono text-sm dark:divide-zinc-800/80">
            {/* 1. Faturamento Transacionado */}
            <div className="flex items-center justify-between py-3">
              <div>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  (+) Faturamento Total Transacionado (Clientes)
                </span>
                <p className="font-sans text-xs text-zinc-400">
                  Total cobrado dos clientes nos serviços de chaveiro
                </p>
              </div>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                {formatBRL(data.resumoVendas.faturamentoBrutoTotal)}
              </span>
            </div>

            {/* 2. Repasse a Parceiros */}
            <div className="flex items-center justify-between py-3 text-zinc-500">
              <div>
                <span>(-) Repasse aos Parceiros / Prestadores</span>
                <p className="font-sans text-xs text-zinc-400">
                  Parte que fica com o terceiro que executou o serviço
                </p>
              </div>
              <span className="font-semibold text-zinc-500">
                -{formatBRL(data.resumoVendas.repasseParceiros)}
              </span>
            </div>

            {/* 3. Receita Bruta da Sua Empresa */}
            <div className="flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/20 px-3 py-3 rounded-lg">
              <div>
                <span className="font-bold text-indigo-700 dark:text-indigo-300">
                  (=) RECEITA BRUTA DA SUA EMPRESA (Comissões)
                </span>
                <p className="font-sans text-xs text-indigo-600/70 dark:text-indigo-400/70">
                  Sua verdadeira entrada financeira sobre a intermediação
                </p>
              </div>
              <span className="font-extrabold text-indigo-700 dark:text-indigo-300">
                {formatBRL(data.resumoVendas.comissaoBrutaTotal)}
              </span>
            </div>

            {/* 4. Provisão Simples Nacional */}
            <div className="flex items-center justify-between py-3 text-rose-600 dark:text-rose-400">
              <div>
                <span>(-) Provisão Simples Nacional ({aliquota}%)</span>
                <p className="font-sans text-xs text-zinc-400">
                  DAS a recolher até o dia 20 do mês seguinte
                </p>
              </div>
              <span className="font-semibold">
                -{formatBRL(data.tributos.provisaoSimplesNacional)}
              </span>
            </div>

            {/* 5. Receita Líquida */}
            <div className="flex items-center justify-between py-3 text-zinc-800 dark:text-zinc-200">
              <div>
                <span className="font-medium">(=) Receita Líquida de Tributos</span>
              </div>
              <span className="font-bold">
                {formatBRL(data.tributos.comissaoLiquidaImposto)}
              </span>
            </div>

            {/* 6. Google Ads */}
            <div className="flex items-center justify-between py-3 text-sky-600 dark:text-sky-400">
              <div>
                <span>(-) Investimento Google Ads (Tráfego Pago)</span>
                <p className="font-sans text-xs text-zinc-400">
                  Gasto com cliques e anúncios para captação dos leads
                </p>
              </div>
              <span className="font-semibold">
                -{formatBRL(data.googleAds.totalGastoAds)}
              </span>
            </div>

            {/* 7. Margem de Contribuição */}
            <div className="flex items-center justify-between bg-sky-50/50 dark:bg-sky-950/20 px-3 py-3 rounded-lg">
              <div>
                <span className="font-bold text-sky-700 dark:text-sky-300">
                  (=) MARGEM DE CONTRIBUIÇÃO LÍQUIDA
                </span>
                <p className="font-sans text-xs text-sky-600/70 dark:text-sky-400/70">
                  O que sobrou da operação de venda para pagar a estrutura fixa
                </p>
              </div>
              <span className="font-extrabold text-sky-700 dark:text-sky-300">
                {formatBRL(data.margemContribuicao.valor)}
              </span>
            </div>

            {/* 8. Contas Fixas */}
            <div className="flex items-center justify-between py-3 text-amber-600 dark:text-amber-400">
              <div>
                <span>(-) Contas Fixas Recorrentes</span>
                <p className="font-sans text-xs text-zinc-400">
                  Aluguel, ferramentas, sistemas, contabilidade
                </p>
              </div>
              <span className="font-semibold">
                -{formatBRL(data.custosOperacionais.totalContasFixasMes)}
              </span>
            </div>

            {/* 9. Saídas Variáveis Pagas */}
            <div className="flex items-center justify-between py-3 text-amber-600 dark:text-amber-400">
              <div>
                <span>(-) Saídas Operacionais Variáveis Pagas</span>
                <p className="font-sans text-xs text-zinc-400">
                  Gastos pontuais registrados em Saídas
                </p>
              </div>
              <span className="font-semibold">
                -{formatBRL(data.custosOperacionais.totalSaidasVariaveisPagas)}
              </span>
            </div>

            {/* 10. LUCRO LÍQUIDO FINAL */}
            <div
              className={`flex items-center justify-between px-4 py-4 rounded-xl text-base ${
                data.resultadoReal.lucroLiquidoReal >= 0
                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                  : "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
              }`}
            >
              <div>
                <span className="font-black text-lg">
                  (=) RESULTADO OPERACIONAL LÍQUIDO
                </span>
                <p className="font-sans text-xs opacity-80">
                  O lucro real final que sobra no bolso do proprietário
                </p>
              </div>
              <span className="font-black text-2xl">
                {formatBRL(data.resultadoReal.lucroLiquidoReal)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: DINHEIRO NA RUA (COMISSÕES A RECEBER) */}
      {filtroAba === "pendencias" && data && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Dinheiro na Rua (Comissões Pendentes de Acerto)
                </h3>
                <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  {data.dinheiroNaRua.quantidadePendencias} pendências
                </span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Valores de comissão que parceiros ainda não te repassaram. Cobrar isso é dinheiro direto para o seu caixa!
              </p>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-right dark:border-rose-900/40 dark:bg-rose-950/30">
              <span className="text-xs font-semibold uppercase text-rose-600 dark:text-rose-400">
                Total Travado
              </span>
              <p className="text-xl font-black text-rose-700 dark:text-rose-300">
                {formatBRL(data.dinheiroNaRua.total)}
              </p>
            </div>
          </div>

          {data.dinheiroNaRua.itens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-2" />
              <p className="font-bold text-zinc-800 dark:text-zinc-200">
                Nenhuma comissão pendente!
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Todos os parceiros estão em dia com os repasses de comissão.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs font-semibold uppercase text-zinc-400 dark:border-zinc-800">
                    <th className="py-3 px-2">Data</th>
                    <th className="py-3 px-2">Cliente</th>
                    <th className="py-3 px-2">Parceiro</th>
                    <th className="py-3 px-2 text-right">Valor Venda</th>
                    <th className="py-3 px-2 text-right">Sua Comissão</th>
                    <th className="py-3 px-2 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {data.dinheiroNaRua.itens.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
                      <td className="py-3 px-2 text-xs text-zinc-500 whitespace-nowrap">
                        {item.dataVenda ? new Date(item.dataVenda).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="py-3 px-2 font-medium text-zinc-900 dark:text-white">
                        {item.clienteNome}
                        {item.clienteTelefone && (
                          <span className="block text-[11px] text-zinc-400">
                            {item.clienteTelefone}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-zinc-700 dark:text-zinc-300">
                        {item.prestadorNome}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-zinc-600 dark:text-zinc-400">
                        {formatBRL(item.valorTotalVenda)}
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatBRL(item.comissao)}
                      </td>
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => marcarComissaoComoPaga(item.id)}
                          disabled={updatingId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {updatingId === item.id ? "Salvando..." : "Recebi (Marcar Paga)"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
