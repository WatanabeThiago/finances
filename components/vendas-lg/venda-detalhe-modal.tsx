"use client";

import { useEffect, useId } from "react";
import type { VendaLg } from "@/lib/venda-lg";
import type { Service } from "@/lib/service";
import type { Partner } from "@/lib/partner";
import { formatBRL } from "@/lib/money";
import { totalVendaLg } from "@/lib/venda-lg";

/* ────────────────────────────────────────────────── helpers ── */

function formatDateTimeBr(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <span
        className={`text-right text-sm font-medium ${accent ?? "text-zinc-900 dark:text-zinc-100"}`}
      >
        {value}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
      {children}
    </p>
  );
}

/* ────────────────────────────────────────────── component ── */

export type VendaDetalheModalProps = {
  venda: VendaLg | null;
  /** Map from servicoId → Service — used to resolve service names. */
  servicoById: Map<string, Service>;
  /** Full list of partners — used to resolve prestadorId. */
  parceiros: Partner[];
  onClose: () => void;
};

export function VendaDetalheModal({
  venda,
  servicoById,
  parceiros,
  onClose,
}: VendaDetalheModalProps) {
  const titleId = useId();

  /* close on Escape */
  useEffect(() => {
    if (!venda) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [venda, onClose]);

  /* lock body scroll while open */
  useEffect(() => {
    if (!venda) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [venda]);

  if (!venda) return null;

  const partner = venda.prestadorId
    ? parceiros.find((p) => p.id === venda.prestadorId) ?? null
    : null;

  const total = totalVendaLg(venda);
  const partnerShare = total - (venda.comissao ?? 0);
  const hasValidCoords =
    venda.latitude != null &&
    venda.longitude != null &&
    venda.latitude !== 0 &&
    venda.longitude !== 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:max-w-xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
          <div className="min-w-0">
            <h3
              id={titleId}
              className="truncate text-base font-bold text-zinc-900 dark:text-zinc-50"
            >
              {venda.clienteNome}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatDateTimeBr(venda.dataVenda ?? venda.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Fechar
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* ── Cliente ── */}
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <SectionTitle>Cliente</SectionTitle>
            <Row label="Nome" value={venda.clienteNome} />
            <Row label="Telefone" value={venda.clienteTelefone || "—"} />
            {venda.clienteDoc && (
              <Row label="Documento" value={venda.clienteDoc} />
            )}
            {venda.vehiclePlate && (
              <Row
                label="Placa"
                value={
                  <span className="rounded bg-sky-50 px-1.5 py-0.5 font-mono text-xs font-bold tracking-widest text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    {venda.vehiclePlate}
                  </span>
                }
              />
            )}
          </div>

          {/* ── Serviços ── */}
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <SectionTitle>Serviços</SectionTitle>
            <ul className="space-y-1.5">
              {venda.linhas.map((ln) => {
                const svc = servicoById.get(ln.servicoId);
                const nome = svc?.nome ?? "Serviço removido";
                return (
                  <li
                    key={ln.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {nome}
                    </span>
                    <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                      {ln.quantidade > 1 && `×${ln.quantidade} `}
                      {formatBRL(ln.preco * ln.quantidade)}
                      {ln.preco !== ln.precoOriginal && (
                        <span className="ml-1 line-through opacity-50">
                          {formatBRL(ln.precoOriginal * ln.quantidade)}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ── Financeiro ── */}
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <SectionTitle>Financeiro</SectionTitle>
            <Row
              label="Total Bruto"
              value={formatBRL(total)}
              accent="text-sky-700 dark:text-sky-400 font-bold"
            />
            {venda.comissao != null && (
              <>
                <Row
                  label="Comissão Retida"
                  value={formatBRL(venda.comissao)}
                  accent="text-violet-600 dark:text-violet-400"
                />
                <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
                <Row
                  label="Repasse ao Parceiro"
                  value={formatBRL(partnerShare)}
                  accent="text-emerald-600 dark:text-emerald-400 font-bold"
                />
                <Row
                  label="Status Comissão"
                  value={
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        venda.comissaoPaga
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}
                    >
                      {venda.comissaoPaga ? "✓ Paga" : "Pendente"}
                    </span>
                  }
                />
              </>
            )}
            <Row
              label="Pagamento do Cliente"
              value={
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    venda.clientePagou
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {venda.clientePagou ? "✓ Pago" : "Pendente"}
                </span>
              }
            />
            {venda.formaPagamento && (
              <Row label="Forma de Pagamento" value={venda.formaPagamento} />
            )}
          </div>

          {/* ── Parceiro ── */}
          {(partner || venda.prestadorId) && (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <SectionTitle>Parceiro / Prestador</SectionTitle>
              {partner ? (
                <div className="flex items-center gap-3">
                  {partner.fotoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={partner.fotoDataUrl}
                      alt={partner.nome}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-700"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-sm font-bold text-white ring-2 ring-zinc-200 dark:ring-zinc-700">
                      {partner.nome
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0].toUpperCase())
                        .join("")}
                    </span>
                  )}
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {partner.nome}
                    </p>
                    {partner.telefone && (
                      <a
                        href={`https://wa.me/${(partner.telefone as string).replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        <svg
                          className="h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        {partner.telefone}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400 dark:text-zinc-500">
                  Prestador removido
                </p>
              )}
            </div>
          )}

          {/* ── Localização ── */}
          {(venda.endereco || hasValidCoords) && (
            <div className="overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between bg-zinc-50/80 px-4 py-2.5 dark:bg-zinc-900/50">
                <SectionTitle>Localização</SectionTitle>
                {hasValidCoords && (
                  <a
                    href={`https://www.google.com/maps?q=${venda.latitude},${venda.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-sky-600 hover:underline dark:text-sky-400"
                  >
                    Google Maps ↗
                  </a>
                )}
              </div>
              {venda.endereco && (
                <p className="px-4 pb-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {venda.endereco}
                </p>
              )}
              {hasValidCoords && (
                <div className="h-52 w-full">
                  <iframe
                    title={`Mapa – ${venda.clienteNome}`}
                    className="h-full w-full border-0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${venda.longitude! - 0.048}%2C${venda.latitude! - 0.032}%2C${venda.longitude! + 0.048}%2C${venda.latitude! + 0.032}&layer=mapnik&marker=${venda.latitude!}%2C${venda.longitude!}`}
                    scrolling="no"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — total pinned at the bottom */}
        <div className="shrink-0 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total do Serviço
            </span>
            <span className="text-xl font-bold tabular-nums text-sky-700 dark:text-sky-400">
              {formatBRL(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
