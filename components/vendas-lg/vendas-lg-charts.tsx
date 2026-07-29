"use client";

import { formatBRL } from "@/lib/money";
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
} from "recharts";
import type { VendaLgChartDatum, VendaLgStats } from "./types";

export type VendasLgChartsProps = {
  data: VendaLgChartDatum[];
  stats: Pick<VendaLgStats, "comissaoPaga" | "comissaoNaoPaga">;
};

type TooltipPayload = {
  dataKey: string;
  name: string;
  value: number;
  fill?: string;
  payload?: { fill?: string };
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      {label ? <p className="mb-1.5 font-semibold text-zinc-700 dark:text-zinc-200">{label}</p> : null}
      {payload.map((item) => (
        <p
          key={item.dataKey ?? item.name}
          style={{ color: item.fill ?? item.payload?.fill }}
          className="leading-5"
        >
          {item.name}: {formatBRL(item.value)}
        </p>
      ))}
    </div>
  );
}

export function VendasLgCharts({ data, stats }: VendasLgChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section className="rounded-xl border border-zinc-200 bg-white/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30 lg:col-span-2">
        <h2 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Faturamento por dia</h2>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barGap={2} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => value === 0 ? "0" : value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="faturamento" name="Faturamento" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="comissao" name="Comissão" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[220px] items-center justify-center text-sm text-zinc-400">Nenhum dado no período</div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
        <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Comissões</h2>
        {stats.comissaoPaga > 0 || stats.comissaoNaoPaga > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Pagas", value: stats.comissaoPaga },
                    { name: "Pendentes", value: stats.comissaoNaoPaga },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-1 flex flex-col gap-1.5 text-xs">
              {[
                ["Pagas", stats.comissaoPaga, "bg-emerald-500"],
                ["Pendentes", stats.comissaoNaoPaga, "bg-amber-400"],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
                    <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
                  </div>
                  <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">{formatBRL(Number(value))}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-[220px] items-center justify-center text-sm text-zinc-400">Sem comissões no período</div>
        )}
      </section>
    </div>
  );
}
