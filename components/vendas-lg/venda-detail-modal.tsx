"use client";

import { useEffect, useId, useState } from "react";
import type { VendaLg } from "@/lib/venda-lg";
import { updateVendaLg } from "@/lib/venda-lg";
import type { Partner } from "@/lib/partner";
import type { Service } from "@/lib/service";
import { formatBRL } from "@/lib/money";

import { SingleLocationMap } from "@/components/locations/single-location-map";

/* ──────────────────────────── Props ──────────────────────────── */

export interface VendaDetailModalProps {
  /** The sale to display. Pass `null` to close/hide the modal. */
  venda: VendaLg | null;
  /** Map servicoId → Service so we can show service names. */
  servicoById: Map<string, Service>;
  /** List of partners so we can resolve prestadorId. */
  parceiros: Partner[];
  /** Called when the user wants to close the modal. */
  onClose: () => void;
  /** Callback fired when any status or field is updated in the modal. */
  onUpdateVenda?: (updatedVenda: VendaLg) => void;
}

/* ──────────────────────────── Helpers ──────────────────────────── */

function getSaleTotal(v: VendaLg): number {
  return v.linhas.reduce((acc, l) => acc + l.preco * l.quantidade, 0);
}

function formatDateTimeBr(dateString?: string): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/* ──────────────────────────── Icons (inline SVGs) ──────────────────────────── */

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

/* ──────────────────────────── Component ──────────────────────────── */

export function VendaDetailModal({
  venda,
  servicoById,
  parceiros,
  onClose,
  onUpdateVenda,
}: VendaDetailModalProps) {
  const titleId = useId();

  const [currentVenda, setCurrentVenda] = useState<VendaLg | null>(venda);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setCurrentVenda(venda);
  }, [venda]);

  // ESC to close
  useEffect(() => {
    if (!venda) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [venda, onClose]);

  if (!venda || !currentVenda) return null;

  const handleUpdateFields = async (fields: Partial<VendaLg>) => {
    const updated = { ...currentVenda, ...fields };
    setCurrentVenda(updated);
    setUpdating(true);

    try {
      const res = await fetch(`/api/vendas-lg/${currentVenda.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        const data = await res.json();
        const normalized = {
          ...data,
          comissao: typeof data.comissao === "string" ? parseFloat(data.comissao) : data.comissao,
          linhas: Array.isArray(data.linhas)
            ? data.linhas.map((l: any) => ({
                ...l,
                precoOriginal: typeof l.precoOriginal === "string" ? parseFloat(l.precoOriginal) : l.precoOriginal,
                preco: typeof l.preco === "string" ? parseFloat(l.preco) : l.preco,
                quantidade: typeof l.quantidade === "string" ? parseInt(l.quantidade, 10) : l.quantidade,
              }))
            : [],
        };
        setCurrentVenda(normalized);
        updateVendaLg(normalized);
        onUpdateVenda?.(normalized);
      } else {
        updateVendaLg(updated);
        onUpdateVenda?.(updated);
      }
    } catch {
      updateVendaLg(updated);
      onUpdateVenda?.(updated);
    } finally {
      setUpdating(false);
    }
  };

  const total = getSaleTotal(currentVenda);
  const partner = currentVenda.prestadorId
    ? parceiros.find((p) => p.id === currentVenda.prestadorId) ?? null
    : null;
  const partnerShare = total - (currentVenda.comissao || 0);
  const hasValidCoords =
    currentVenda.latitude != null &&
    currentVenda.longitude != null &&
    currentVenda.latitude !== 0 &&
    currentVenda.longitude !== 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/50 sm:justify-center sm:p-4"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[min(92dvh,840px)] w-full overflow-hidden rounded-t-2xl border border-zinc-200 bg-background shadow-2xl dark:border-zinc-800 sm:mx-auto sm:max-w-lg sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex max-h-[inherit] flex-col">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <h3
                id={titleId}
                className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Detalhes da Venda
              </h3>
              {updating && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-sky-500" />
                  Salvando…
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* ── Client Info ── */}
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Cliente
              </h4>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/30 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {currentVenda.clienteNome}
                  </p>
                  {currentVenda.clienteDoc && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                      {currentVenda.clienteDoc}
                    </span>
                  )}
                </div>
                {currentVenda.clienteTelefone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 tabular-nums">
                      {currentVenda.clienteTelefone}
                    </span>
                    <a
                      href={`https://wa.me/${currentVenda.clienteTelefone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-400/20"
                    >
                      <WhatsAppIcon className="h-2.5 w-2.5" />
                      WhatsApp
                    </a>
                  </div>
                )}
                {currentVenda.vehiclePlate && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                    🚗 Placa {currentVenda.vehiclePlate}
                  </p>
                )}
                {currentVenda.endereco && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    📍 {currentVenda.endereco}
                  </p>
                )}
              </div>
            </section>

            {/* ── Service Items ── */}
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Itens / Serviços
              </h4>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/30 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200/80 dark:border-zinc-700/60">
                      <th className="px-3.5 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">Serviço</th>
                      <th className="px-3.5 py-2 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">Qtd</th>
                      <th className="px-3.5 py-2 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400">Unit.</th>
                      <th className="px-3.5 py-2 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {currentVenda.linhas.map((ln) => {
                      const serviceName = servicoById.get(ln.servicoId)?.nome ?? "Serviço removido";
                      const subtotal = ln.preco * ln.quantidade;
                      const hasDiscount = ln.precoOriginal > 0 && ln.preco < ln.precoOriginal;
                      return (
                        <tr key={ln.id}>
                          <td className="px-3.5 py-2 font-medium text-zinc-900 dark:text-zinc-50">
                            {serviceName}
                          </td>
                          <td className="px-3.5 py-2 text-center text-zinc-600 dark:text-zinc-400">
                            {ln.quantidade}
                          </td>
                          <td className="px-3.5 py-2 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                            {hasDiscount && (
                              <span className="mr-1.5 text-[10px] text-zinc-400 line-through dark:text-zinc-500">
                                {formatBRL(ln.precoOriginal)}
                              </span>
                            )}
                            {formatBRL(ln.preco)}
                          </td>
                          <td className="px-3.5 py-2 text-right tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatBRL(subtotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-200 dark:border-zinc-700">
                      <td colSpan={3} className="px-3.5 py-2.5 text-right text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Total
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums text-base font-bold text-sky-700 dark:text-sky-400">
                        {formatBRL(total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* ── Financial Details & Interactive Status ── */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Status & Financeiro
                </h4>
                <span className="text-[10px] text-zinc-400">Clique para alterar status rápido</span>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/30 space-y-3">
                {/* Total */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">Valor Total</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{formatBRL(total)}</span>
                </div>

                {/* Status Pagamento Cliente (Toggle) */}
                <div className="flex items-center justify-between text-sm pt-1 border-t border-zinc-200/50 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">Pagamento do Cliente</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateFields({ clientePagou: !currentVenda.clientePagou })}
                    disabled={updating}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all shadow-sm ${
                      currentVenda.clientePagou
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 ring-1 ring-emerald-600/30"
                        : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 ring-1 ring-zinc-500/30"
                    }`}
                  >
                    {currentVenda.clientePagou ? "✓ Pago" : "⏳ Pendente"}
                    <span className="text-[10px] opacity-70">(alterar)</span>
                  </button>
                </div>

                {/* Forma de Pagamento (Select) */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">Forma de Pagamento</span>
                  <select
                    value={currentVenda.formaPagamento || ""}
                    onChange={(e) => handleUpdateFields({ formaPagamento: e.target.value })}
                    disabled={updating}
                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">Não informada</option>
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Boleto">Boleto</option>
                  </select>
                </div>

                {/* Status Comissão (Toggle) */}
                <div className="flex items-center justify-between text-sm pt-1 border-t border-zinc-200/50 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">Status da Comissão</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateFields({ comissaoPaga: !currentVenda.comissaoPaga })}
                    disabled={updating}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all shadow-sm ${
                      currentVenda.comissaoPaga
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 ring-1 ring-emerald-600/30"
                        : "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60 ring-1 ring-amber-600/30"
                    }`}
                  >
                    {currentVenda.comissaoPaga ? "✓ Paga" : "⏳ Pendente"}
                    <span className="text-[10px] opacity-70">(alterar)</span>
                  </button>
                </div>

                {/* Valor da Comissão */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">Comissão Retida</span>
                  <span className="font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
                    {formatBRL(currentVenda.comissao || 0)}
                  </span>
                </div>

                {/* Repasse ao Parceiro */}
                <div className="flex items-center justify-between text-sm border-t border-zinc-200/60 pt-2 dark:border-zinc-700/60">
                  <span className="font-medium text-zinc-900 dark:text-zinc-200">Repasse ao Parceiro</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatBRL(partnerShare)}</span>
                </div>
              </div>
            </section>

            {/* ── Partner Section & Assignment ── */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Prestador Vinculado
                </h4>
                <select
                  value={currentVenda.prestadorId || ""}
                  onChange={(e) => handleUpdateFields({ prestadorId: e.target.value || undefined })}
                  disabled={updating}
                  className="max-w-[210px] truncate rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Nenhum prestador</option>
                  {parceiros.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              {partner ? (
                <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/30">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    {partner.fotoDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={partner.fotoDataUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                        {partner.nome.trim().charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {partner.nome}
                    </p>
                    {partner.endereco && (
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        📍 {partner.endereco}
                      </p>
                    )}
                  </div>
                  {partner.telefone && (
                    <a
                      href={`https://wa.me/${partner.telefone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                      aria-label="WhatsApp do prestador"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic px-1">Sem prestador de serviço vinculado a esta venda.</p>
              )}
            </section>

            {/* ── Dates ── */}
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Datas
              </h4>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/30 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Data da Venda</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatDateTimeBr(currentVenda.dataVenda)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Registrado em</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatDateTimeBr(currentVenda.createdAt)}</span>
                </div>
              </div>
            </section>

            {/* ── Map ── */}
            {hasValidCoords && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Localização
                  </h4>
                  <a
                    href={`https://www.google.com/maps?q=${currentVenda.latitude},${currentVenda.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-medium text-sky-600 hover:underline dark:text-sky-400"
                  >
                    Google Maps ↗
                  </a>
                </div>
                <div className="overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-800 h-48">
                  <SingleLocationMap
                    latitude={currentVenda.latitude!}
                    longitude={currentVenda.longitude!}
                    popupTitle={currentVenda.clienteNome}
                    popupSubtitle={currentVenda.endereco}
                  />
                </div>
              </section>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-full items-center justify-center rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-200 active:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
