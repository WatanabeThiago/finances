"use client";

import {
  formatBRL,
  formatNumberBrInput,
  parseMoney,
} from "@/lib/money";
import type { Partner } from "@/lib/partner";
import {
  parsePartnersJson,
  partnersStorageSnapshot,
  subscribePartners,
} from "@/lib/partner";
import type { Service } from "@/lib/service";
import {
  parseServicesJson,
  servicesStorageSnapshot,
  subscribeServices,
} from "@/lib/service";
import type { VendaLg, VendaLgLine } from "@/lib/venda-lg";
import {
  appendVendaLg,
  updateVendaLg,
  parseVendasLgJson,
  totalVendaLg,
  vendasLgStorageSnapshot,
  subscribeVendasLg,
} from "@/lib/venda-lg";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

function newId(): string {
  return crypto.randomUUID();
}

type LineDraft = {
  id: string;
  servicoId: string;
  precoOriginal: string;
  preco: string;
  quantidade: string;
};

function parseQty(input: string): number | undefined {
  const t = input.trim();
  if (!t) return undefined;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return n;
}

function emptyModalState() {
  return {
    clienteNome: "",
    clienteTelefone: "",
    clienteDoc: "",
    prestadorId: "",
    comissao: "",
    comissaoPaga: false,
    servicoQuery: "",
    linhas: [] as LineDraft[],
  };
}

type ModalMode = "create" | "edit";

export function VendasLgScreen() {
  const parcerosRaw = useSyncExternalStore(
    subscribePartners,
    partnersStorageSnapshot,
    () => "[]"
  );
  const parceiros = useMemo(() => parsePartnersJson(parcerosRaw), [parcerosRaw]);

  const vendasRaw = useSyncExternalStore(
    subscribeVendasLg,
    vendasLgStorageSnapshot,
    () => "[]"
  );
  const vendas = useMemo(() => parseVendasLgJson(vendasRaw), [vendasRaw]);

  const servicosRaw = useSyncExternalStore(
    subscribeServices,
    servicesStorageSnapshot,
    () => "[]"
  );
  const servicos = useMemo(() => parseServicesJson(servicosRaw), [servicosRaw]);

  const servicoById = useMemo(() => {
    const m = new Map<string, Service>();
    for (const s of servicos) m.set(s.id, s);
    return m;
  }, [servicos]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingVendaId, setEditingVendaId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyModalState);
  const [formError, setFormError] = useState<string | null>(null);
  const titleId = useId();
  const descId = useId();

  const openModal = useCallback((vendaToEdit?: VendaLg) => {
    if (vendaToEdit) {
      setModalMode("edit");
      setEditingVendaId(vendaToEdit.id);
      const linhas: LineDraft[] = vendaToEdit.linhas.map((l) => ({
        id: l.id,
        servicoId: l.servicoId,
        precoOriginal: l.precoOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        preco: l.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        quantidade: l.quantidade.toString(),
      }));
      setForm({
        clienteNome: vendaToEdit.clienteNome,
        clienteTelefone: vendaToEdit.clienteTelefone,
        clienteDoc: vendaToEdit.clienteDoc ?? "",
        prestadorId: vendaToEdit.prestadorId ?? "",
        comissao: vendaToEdit.comissao ? vendaToEdit.comissao.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
        comissaoPaga: vendaToEdit.comissaoPaga ?? false,
        servicoQuery: "",
        linhas,
      });
    } else {
      setModalMode("create");
      setEditingVendaId(null);
      setForm(emptyModalState());
    }
    setFormError(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setFormError(null);
  }, []);

  const filteredServicos = useMemo(() => {
    const q = form.servicoQuery.trim().toLowerCase();
    if (!q) return servicos;
    return servicos.filter((s) => s.nome.toLowerCase().includes(q));
  }, [servicos, form.servicoQuery]);

  const addServicoLinha = useCallback((s: Service) => {
    const br = formatNumberBrInput(s.valor);
    setForm((f) => ({
      ...f,
      servicoQuery: "",
      linhas: [
        ...f.linhas,
        {
          id: newId(),
          servicoId: s.id,
          precoOriginal: br,
          preco: br,
          quantidade: "1",
        },
      ],
    }));
    setFormError(null);
  }, []);

  const removeLinha = useCallback((lineId: string) => {
    setForm((f) => ({
      ...f,
      linhas: f.linhas.filter((l) => l.id !== lineId),
    }));
  }, []);

  const updateLinha = useCallback(
    (lineId: string, patch: Partial<LineDraft>) => {
      setForm((f) => ({
        ...f,
        linhas: f.linhas.map((l) =>
          l.id === lineId ? { ...l, ...patch } : l
        ),
      }));
    },
    []
  );

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const nome = form.clienteNome.trim();
      const tel = form.clienteTelefone.trim();
      if (!tel) {
        setFormError("Informe o telefone do cliente.");
        return;
      }
      if (!nome) {
        setFormError("Informe o nome do cliente.");
        return;
      }
      if (form.linhas.length === 0) {
        setFormError("Adicione pelo menos um serviço.");
        return;
      }

      const linhas: VendaLgLine[] = [];
      for (const l of form.linhas) {
        const po = parseMoney(l.precoOriginal);
        const pv = parseMoney(l.preco);
        const q = parseQty(l.quantidade);
        if (po === undefined || pv === undefined) {
          setFormError("Confira preço original e preço de venda em todas as linhas.");
          return;
        }
        if (po < 0 || pv < 0) {
          setFormError("Preços não podem ser negativos.");
          return;
        }
        if (q === undefined) {
          setFormError("Informe uma quantidade válida (inteiro ≥ 1) em cada linha.");
          return;
        }
        linhas.push({
          id: newId(),
          servicoId: l.servicoId,
          precoOriginal: po,
          preco: pv,
          quantidade: q,
        });
      }

      const doc = form.clienteDoc.trim();
      const comissaoValue = parseMoney(form.comissao);
      const comissao = comissaoValue ?? 0;
      const venda: VendaLg = {
        id: modalMode === "edit" && editingVendaId ? editingVendaId : newId(),
        createdAt: modalMode === "edit" && editingVendaId ? vendas.find((v) => v.id === editingVendaId)?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
        clienteNome: nome,
        clienteTelefone: tel,
        ...(doc ? { clienteDoc: doc } : {}),
        ...(form.prestadorId ? { prestadorId: form.prestadorId } : {}),
        ...(comissao > 0 ? { comissao } : {}),
        ...(form.comissaoPaga && comissao > 0 ? { comissaoPaga: true } : {}),
        linhas,
      };

      if (modalMode === "edit") {
        updateVendaLg(venda);
      } else {
        appendVendaLg(venda);
      }
      closeModal();
    },
    [form, closeModal, modalMode, editingVendaId, vendas]
  );

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  const listContent = useMemo(() => {
    if (vendas.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nenhuma venda registrada
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Use &quot;Nova Venda&quot; para registrar cliente e serviços.
          </p>
        </div>
      );
    }
    return (
      <ul className="flex flex-col gap-3">
        {vendas.map((v) => (
          <li
            key={v.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {v.clienteTelefone}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {v.clienteNome}
                  {v.clienteDoc ? ` · ${v.clienteDoc}` : ""}
                </p>
                {v.prestadorId ? (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                    Prestador: <span className="font-medium">{(() => {
                      const p = parceiros.find((pc) => pc.id === v.prestadorId);
                      return p?.nome ?? "Prestador removido";
                    })()}</span>
                  </p>
                ) : null}
                {v.comissao ? (
                  <p className="mt-1 text-xs">
                    <span className={v.comissaoPaga ? "rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200" : "rounded-full bg-amber-100 px-2 py-0.5 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200"}>
                      Comissão {v.comissaoPaga ? "✓ Paga" : "Pendente"} · {formatBRL(v.comissao)}
                    </span>
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="text-lg font-semibold tabular-nums text-sky-700 dark:text-sky-400">
                  {formatBRL(totalVendaLg(v))}
                </p>
                <button
                  type="button"
                  onClick={() => openModal(v)}
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  aria-label="Editar venda"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
              {new Date(v.createdAt).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
            <ul className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
              {v.linhas.map((ln) => {
                const sn =
                  servicoById.get(ln.servicoId)?.nome ?? "Serviço removido";
                return (
                  <li
                    key={ln.id}
                    className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-zinc-700 dark:text-zinc-300"
                  >
                    <span className="min-w-0">
                      {sn}{" "}
                      <span className="text-zinc-500">
                        ×{ln.quantidade}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-zinc-600 dark:text-zinc-400">
                      {formatBRL(ln.preco * ln.quantidade)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    );
  }, [vendas, servicoById, parceiros]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 pb-28">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Registro local de vendas (lead generation). Cadastre serviços em
        &quot;Serviços&quot; para poder selecioná-los aqui.
      </p>

      {listContent}

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:border-zinc-800">
        <div className="mx-auto w-full max-w-lg">
          <button
            type="button"
            onClick={() => openModal()}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-600 text-base font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 active:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            Nova Venda
          </button>
        </div>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/50 sm:items-center sm:justify-center sm:p-4"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="flex max-h-[min(94dvh,800px)] w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-background shadow-2xl dark:border-zinc-800 sm:max-w-lg sm:rounded-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h3
                id={titleId}
                className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
              >
                {modalMode === "edit" ? "Editar Venda" : "Nova Venda"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>

            <form
              onSubmit={submit}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div
                id={descId}
                className="flex-1 space-y-5 overflow-y-auto px-4 py-4"
              >
                {formError ? (
                  <p
                    className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
                    role="alert"
                  >
                    {formError}
                  </p>
                ) : null}

                <section>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Cliente
                  </h4>
                  <div className="mt-3 space-y-3">
                    <label className="block">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        Telefone
                      </span>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={form.clienteTelefone}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            clienteTelefone: e.target.value,
                          }))
                        }
                        autoComplete="tel"
                        className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                        placeholder="(11) 99999-9999"
                        autoFocus
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        Nome
                      </span>
                      <input
                        type="text"
                        value={form.clienteNome}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            clienteNome: e.target.value,
                          }))
                        }
                        autoComplete="name"
                        className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                        placeholder="Nome completo ou fantasia"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        CPF/CNPJ{" "}
                        <span className="font-normal text-zinc-500">
                          (opcional)
                        </span>
                      </span>
                      <input
                        type="text"
                        value={form.clienteDoc}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            clienteDoc: e.target.value,
                          }))
                        }
                        className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                        placeholder="Somente se precisar"
                      />
                    </label>
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Prestador de Serviços
                  </h4>
                  <div className="mt-3 space-y-3">
                    <label className="block">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        Selecione{" "}
                        <span className="font-normal text-zinc-500">
                          (opcional)
                        </span>
                      </span>
                      <select
                        value={form.prestadorId}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            prestadorId: e.target.value,
                          }))
                        }
                        className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                      >
                        <option value="">Sem prestador</option>
                        {parceiros.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Comissão
                  </h4>
                  <div className="mt-3 space-y-3">
                    <label className="block">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        Valor{" "}
                        <span className="font-normal text-zinc-500">
                          (opcional)
                        </span>
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.comissao}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            comissao: e.target.value,
                          }))
                        }
                        className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                        placeholder="0,00"
                      />
                    </label>
                    {form.comissao.trim() && (
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
                        <input
                          type="checkbox"
                          checked={form.comissaoPaga}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              comissaoPaga: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-zinc-400 text-sky-600 focus:ring-sky-500"
                        />
                        <span className="text-[15px] text-zinc-800 dark:text-zinc-200">
                          Comissão Paga
                        </span>
                      </label>
                    )}
                  </div>
                </section>

                <section className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900/50">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Total
                  </h4>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-sky-700 dark:text-sky-400">
                    {form.linhas.length > 0
                      ? formatBRL(
                          form.linhas.reduce((acc, l) => {
                            const preco = parseMoney(l.preco) ?? 0;
                            const qty = parseQty(l.quantidade) ?? 0;
                            return acc + preco * qty;
                          }, 0)
                        )
                      : formatBRL(0)}
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Serviços
                  </h4>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Busque e toque em um serviço para adicionar à venda. Você
                    pode ajustar preços e quantidade em cada linha.
                  </p>

                  {servicos.length === 0 ? (
                    <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                      Não há serviços cadastrados. Vá em Serviços e cadastre
                      antes.
                    </p>
                  ) : (
                    <>
                      <input
                        type="search"
                        value={form.servicoQuery}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            servicoQuery: e.target.value,
                          }))
                        }
                        className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                        placeholder="Digite para filtrar serviços…"
                        autoComplete="off"
                      />
                      <ul
                        className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700"
                        role="listbox"
                      >
                        {filteredServicos.length === 0 ? (
                          <li className="px-3 py-3 text-sm text-zinc-500">
                            Nenhum serviço encontrado.
                          </li>
                        ) : (
                          filteredServicos.map((s) => (
                            <li key={s.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                              <button
                                type="button"
                                onClick={() => addServicoLinha(s)}
                                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[15px] hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-900 dark:active:bg-zinc-800"
                              >
                                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                                  {s.nome}
                                </span>
                                <span className="shrink-0 text-sm tabular-nums text-zinc-500">
                                  {formatBRL(s.valor)}
                                </span>
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </>
                  )}

                  {form.linhas.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Itens da venda
                      </p>
                      {form.linhas.map((ln) => {
                        const nomeServ =
                          servicoById.get(ln.servicoId)?.nome ?? "Serviço";
                        return (
                          <div
                            key={ln.id}
                            className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium leading-snug text-zinc-900 dark:text-zinc-50">
                                {nomeServ}
                              </p>
                              <button
                                type="button"
                                onClick={() => removeLinha(ln.id)}
                                className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                              >
                                Remover
                              </button>
                            </div>
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <label className="block">
                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                  Preço original
                                </span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={ln.precoOriginal}
                                  onChange={(e) =>
                                    updateLinha(ln.id, {
                                      precoOriginal: e.target.value,
                                    })
                                  }
                                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                                />
                              </label>
                              <label className="block">
                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                  Preço (venda)
                                </span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={ln.preco}
                                  onChange={(e) =>
                                    updateLinha(ln.id, {
                                      preco: e.target.value,
                                    })
                                  }
                                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                                />
                              </label>
                              <label className="block">
                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                  Quantidade
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={ln.quantidade}
                                  onChange={(e) =>
                                    updateLinha(ln.id, {
                                      quantidade: e.target.value,
                                    })
                                  }
                                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              </div>

              <div className="shrink-0 border-t border-zinc-200 p-4 dark:border-zinc-800">
                <button
                  type="submit"
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-600 text-base font-semibold text-white hover:bg-sky-700 active:bg-sky-800"
                >
                  Salvar venda
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
