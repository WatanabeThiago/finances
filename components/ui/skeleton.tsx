import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200/80 dark:bg-zinc-800/80 ${className}`}
      {...props}
    />
  );
}

/**
 * Skeleton para linhas de tabela ou listas de itens
 */
export function SkeletonList({
  count = 5,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-xl border border-zinc-200/60 bg-white/70 p-4 shadow-xs dark:border-zinc-800/60 dark:bg-zinc-900/40"
        >
          <div className="flex items-center gap-3.5 flex-1">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex flex-col gap-2 flex-1 max-w-md">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-20 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para cards estatísticos (métricas/KPIs)
 */
export function SkeletonStatsCards({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-zinc-200/70 bg-white/60 p-4 dark:border-zinc-800/70 dark:bg-zinc-900/40"
        >
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para linhas de tabelas <table>
 */
export function SkeletonTableRow({
  columns = 5,
}: {
  columns?: number;
}) {
  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800/60">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <Skeleton className={`h-4 ${i === 0 ? "w-36" : i === columns - 1 ? "w-16 ml-auto" : "w-20"}`} />
        </td>
      ))}
    </tr>
  );
}