import type { Partner } from "@/lib/partner";
import type {
  VendaLgCommissionFilter,
  VendaLgDateRange,
} from "./types";

const dateOptions: Array<{ value: VendaLgDateRange; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "all", label: "Todas" },
  { value: "upcoming", label: "Próximos dias" },
];

export type VendasLgFiltersProps = {
  parceiros: Partner[];
  dateRange: VendaLgDateRange;
  parceiroId: string;
  commission: VendaLgCommissionFilter;
  onDateRangeChange: (value: VendaLgDateRange) => void;
  onParceiroChange: (value: string) => void;
  onCommissionChange: (value: VendaLgCommissionFilter) => void;
};

const inactiveButton =
  "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900";

export function VendasLgFilters({
  parceiros,
  dateRange,
  parceiroId,
  commission,
  onDateRangeChange,
  onParceiroChange,
  onCommissionChange,
}: VendasLgFiltersProps) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          Filtrar por data
        </legend>
        <div className="flex flex-wrap gap-2">
          {dateOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={dateRange === option.value}
              onClick={() => onDateRangeChange(option.value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                dateRange === option.value
                  ? "bg-sky-600 text-white dark:bg-sky-700"
                  : inactiveButton
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          Filtrar por parceiro
        </span>
        <select
          value={parceiroId}
          onChange={(event) => onParceiroChange(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <option value="">Todos os parceiros</option>
          {parceiros.map((parceiro) => (
            <option key={parceiro.id} value={parceiro.id}>
              {parceiro.nome}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          Filtrar por comissão
        </legend>
        <div className="flex gap-2">
          {([
            ["all", "Todas", "bg-sky-600 dark:bg-sky-700"],
            ["pago", "Pagas ✓", "bg-green-600 dark:bg-green-700"],
            ["nao-pago", "Não pagas", "bg-red-600 dark:bg-red-700"],
          ] as const).map(([value, label, activeClass]) => (
            <button
              key={value}
              type="button"
              aria-pressed={commission === value}
              onClick={() => onCommissionChange(value)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                commission === value
                  ? `${activeClass} text-white`
                  : inactiveButton
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
