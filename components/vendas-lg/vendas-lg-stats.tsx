import { formatBRL } from "@/lib/money";
import type { VendaLgStats } from "./types";

export type VendasLgStatsCardsProps = { stats: VendaLgStats };

const cards = [
  ["comissaoMedia", "Comissão média", "violet"],
  ["comissaoTotal", "Comissão", "indigo"],
  ["comissaoPaga", "Comissões pagas", "emerald"],
  ["comissaoNaoPaga", "Comissões não pagas", "amber"],
  ["faturamentoParceiro", "Faturamento do parceiro", "blue"],
  ["faturamentoTotal", "Faturamento total", "green"],
] as const;

const colorClasses = {
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400",
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  green: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
};

export function VendasLgStatsCards({ stats }: VendasLgStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {cards.map(([key, label, color]) => (
        <div
          key={key}
          className={`rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 ${colorClasses[color]}`}
        >
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-bold">{formatBRL(stats[key])}</p>
          {key === "comissaoMedia" ? (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {stats.totalVendas} venda{stats.totalVendas !== 1 ? "s" : ""}
            </p>
          ) : key === "comissaoTotal" ? (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Total</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
