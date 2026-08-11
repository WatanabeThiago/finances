"use client";

import type { Partner } from "@/lib/partner";
import {
  parsePartnersJson,
  partnersStorageSnapshot,
  subscribePartners,
} from "@/lib/partner";
import type { Produto } from "@/lib/produto";
import {
  parseProdutosJson,
  produtosStorageSnapshot,
  subscribeProdutos,
} from "@/lib/produto";
import { formatBRL, parseMoney } from "@/lib/money";
import type { Service } from "@/lib/service";
import {
  parseServicesJson,
} from "@/lib/service";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

function newId(): string {
  return crypto.randomUUID();
}

type FormState = {
  fotoDataUrl: string;
  nome: string;
  valor: string;
  valorNoturno: string;
  gastosEstimados: string;
  observacoes: string;
  prestadorIds: string[];
  produtoIds: string[];
  automotivo: boolean;
  residencial: boolean;
  ferramentas: string;
};

const emptyForm = (): FormState => ({
  fotoDataUrl: "",
  nome: "",
  valor: "",
  valorNoturno: "",
  gastosEstimados: "",
  observacoes: "",
  prestadorIds: [],
  produtoIds: [],
  automotivo: false,
  residencial: false,
  ferramentas: "",
});

type ModalMode = "create" | "edit";

function toggleId(ids: string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  return [...ids, id];
}

// Helper to convert API response to Service format
function normalizeServices(data: any[]): Service[] {
  return data.map((s: any) => ({
    ...s,
    valor: typeof s.valor === "string" ? parseFloat(s.valor) : s.valor,
    valorNoturno: typeof s.valorNoturno === "string" ? parseFloat(s.valorNoturno) : s.valorNoturno,
    gastosEstimados: typeof s.gastosEstimados === "string" ? parseFloat(s.gastosEstimados) : s.gastosEstimados,
  }));
}

/* ── avatar ───────────────────────────────────────────────────────────── */

function ServiceAvatar({
  service,
  size = "md",
}: {
  service: Service;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  return (
    <div
      className={`relative ${dim} shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800`}
    >
      {service.fotoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={service.fotoDataUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-semibold text-zinc-500 dark:text-zinc-400">
          {service.nome.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </div>
  );
}

function SegmentBadges({ service }: { service: Service }) {
  return (
    <div className="flex flex-wrap gap-1">
      {service.automotivo && (
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900 dark:bg-sky-950/80 dark:text-sky-200">
          Automotivo
        </span>
      )}
      {service.residencial && (
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900 dark:bg-violet-950/80 dark:text-violet-200">
          Residencial
        </span>
      )}
      {!service.automotivo && !service.residencial && (
        <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
      )}
    </div>
  );
}

/* ── icons ───────────────────────────────────────────────────────────── */

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

export function ServicosScreen() {
  const partnersRaw = useSyncExternalStore(
    subscribePartners,
    partnersStorageSnapshot,
    () => "[]"
  );
  const partners = useMemo(() => parsePartnersJson(partnersRaw), [partnersRaw]);

  const produtosRaw = useSyncExternalStore(
    subscribeProdutos,
    produtosStorageSnapshot,
    () => "[]"
  );
  const produtos = useMemo(() => parseProdutosJson(produtosRaw), [produtosRaw]);

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch services from API
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/servicos");
        if (!response.ok) throw new Error("Falha ao carregar serviços");
        const data = await response.json();
        setServices(normalizeServices(data));
        setError(null);
      } catch (err) {
        console.error("Error fetching services:", err);
        setError("Erro ao carregar serviços");
        // Fallback to localStorage
        const localData = localStorage.getItem("finances.servicos.v1");
        if (localData) {
          setServices(parseServicesJson(localData));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);



  const partnerById = useMemo(() => {
    const m = new Map<string, Partner>();
    for (const p of partners) m.set(p.id, p);
    return m;
  }, [partners]);

  const produtoById = useMemo(() => {
    const m = new Map<string, Produto>();
    for (const p of produtos) m.set(p.id, p);
    return m;
  }, [produtos]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descId = useId();

  const openModal = useCallback((serviceToEdit?: Service) => {
    // Always reset to create mode first
    setModalMode("create");
    setEditingServiceId(null);
    setFormError(null);
    
    if (serviceToEdit) {
      setModalMode("edit");
      setEditingServiceId(serviceToEdit.id);
      setForm({
        fotoDataUrl: serviceToEdit.fotoDataUrl ?? "",
        nome: serviceToEdit.nome,
        valor: serviceToEdit.valor.toString(),
        valorNoturno: serviceToEdit.valorNoturno.toString(),
        gastosEstimados: serviceToEdit.gastosEstimados.toString(),
        observacoes: serviceToEdit.observacoes,
        prestadorIds: serviceToEdit.prestadorIds ?? [],
        produtoIds: serviceToEdit.produtoIds ?? [],
        automotivo: serviceToEdit.automotivo,
        residencial: serviceToEdit.residencial,
        ferramentas: serviceToEdit.ferramentas ?? "",
      });
    } else {
      setForm(emptyForm());
    }
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setFormError(null);
    setEditingServiceId(null);
    setModalMode("create");
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  const onPickPhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Escolha um arquivo de imagem.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") {
        setForm((f) => ({ ...f, fotoDataUrl: r }));
        setFormError(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const nome = form.nome.trim();
      if (!nome) {
        setFormError("Informe o nome do serviço.");
        return;
      }
      const valor = parseFloat(form.valor);
      if (isNaN(valor)) {
        setFormError("Informe um valor válido.");
        return;
      }
      if (valor < 0) {
        setFormError("O valor não pode ser negativo.");
        return;
      }
      const valorNoturno = parseFloat(form.valorNoturno) || 0;
      const gastosEstimados = parseFloat(form.gastosEstimados) || 0;
      if (valorNoturno < 0 || gastosEstimados < 0) {
        setFormError("Valores noturnos e gastos não podem ser negativos.");
        return;
      }

      setSubmitting(true);
      try {
        const url = modalMode === "edit" 
          ? `/api/servicos/${editingServiceId}`
          : "/api/servicos";
        
        const method = modalMode === "edit" ? "PUT" : "POST";
        
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome,
            valor,
            valorNoturno,
            gastosEstimados,
            observacoes: form.observacoes.trim(),
            fotoDataUrl: form.fotoDataUrl || null,
            automotivo: form.automotivo,
            residencial: form.residencial,
            prestadorIds: form.prestadorIds,
            produtoIds: form.produtoIds,
            ferramentas: form.ferramentas.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error("Falha ao salvar serviço");
        }

        // Refresh the services list
        const refreshResponse = await fetch("/api/servicos");
        if (refreshResponse.ok) {
          const updatedServices = await refreshResponse.json();
          setServices(normalizeServices(updatedServices));
        }

        closeModal();
      } catch (err) {
        console.error("Error submitting service:", err);
        setFormError("Erro ao salvar serviço. Tente novamente.");
      } finally {
        setSubmitting(false);
      }
    },
    [form, closeModal, modalMode, editingServiceId]
  );

  const deleteService = useCallback(
    async (id: string) => {
      if (!confirm("Tem certeza que deseja deletar este serviço?")) return;
      
      try {
        const response = await fetch(`/api/servicos/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Falha ao deletar serviço");
        }

        // Refresh the services list
        const refreshResponse = await fetch("/api/servicos");
        if (refreshResponse.ok) {
          const updatedServices = await refreshResponse.json();
          setServices(normalizeServices(updatedServices));
        }
      } catch (err) {
        console.error("Error deleting service:", err);
        alert("Erro ao deletar serviço");
      }
    },
    []
  );
  /* ── segment filters ────────────────────────────────────────────── */
  const [segmentFilter, setSegmentFilter] = useState<"all" | "automotivo" | "residencial">("all");

  const filteredServices = useMemo(() => {
    if (segmentFilter === "automotivo") {
      return services.filter((s) => s.automotivo);
    }
    if (segmentFilter === "residencial") {
      return services.filter((s) => s.residencial);
    }
    return services;
  }, [services, segmentFilter]);

  /* ── expanded rows state ────────────────────────────────────────── */
  const [expandedServiceIds, setExpandedServiceIds] = useState<Record<string, boolean>>({});
  const [viewPartnersService, setViewPartnersService] = useState<Service | null>(null);

  const toggleRow = useCallback((serviceId: string) => {
    setExpandedServiceIds((prev) => ({
      ...prev,
      [serviceId]: !prev[serviceId],
    }));
  }, []);

  /* ── DESKTOP TABLE ──────────────────────────────────────────────── */
  function renderDesktopTable() {
    return (
      <div className="hidden md:block overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/60">
              <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Serviço
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Valor Padrão
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Valor Noturno
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Gastos Estimados
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Segmento
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {filteredServices.map((s, index) => {
              const isEven = index % 2 === 0;
              const isExpanded = !!expandedServiceIds[s.id];
              return (
                <Fragment key={s.id}>
                  <tr
                    onClick={() => toggleRow(s.id)}
                    className={`group cursor-pointer transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70 ${
                      isExpanded
                        ? "bg-zinc-100/40 dark:bg-zinc-900/30"
                        : isEven
                        ? "bg-white dark:bg-zinc-950"
                        : "bg-zinc-50 dark:bg-zinc-900/40"
                    }`}
                  >
                    {/* Serviço */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ServiceAvatar service={s} size="sm" />
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">
                          {s.nome}
                        </span>
                      </div>
                    </td>
                    {/* Valor */}
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {formatBRL(s.valor)}
                    </td>
                    {/* Valor Noturno */}
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {formatBRL(s.valorNoturno)}
                    </td>
                    {/* Gastos */}
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {formatBRL(s.gastosEstimados)}
                    </td>
                    {/* Segmento */}
                    <td className="px-4 py-3">
                      <SegmentBadges service={s} />
                    </td>
                    {/* Ações */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setViewPartnersService(s)}
                          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          title="Ver prestadores"
                          aria-label="Ver prestadores vinculados"
                        >
                          <UsersIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openModal(s)}
                          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          aria-label="Editar serviço"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteService(s.id)}
                          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          aria-label="Deletar serviço"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row Details */}
                  {isExpanded && (
                    <tr className="bg-zinc-100/10 dark:bg-zinc-900/15">
                      <td colSpan={6} className="px-10 py-4">
                        <div className="flex flex-col gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {s.observacoes && (
                            <div>
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                                Observações:
                              </span>
                              <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400">
                                {s.observacoes}
                              </p>
                            </div>
                          )}

                          {/* Produtos */}
                          <div>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1.5">
                              Produtos Usados no Serviço:
                            </span>
                            {s.produtoIds && s.produtoIds.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {s.produtoIds.map((pid) => {
                                  const label = produtoById.get(pid)?.nome ?? "Produto removido";
                                  return (
                                    <span
                                      key={pid}
                                      className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-950 dark:bg-amber-950/80 dark:text-amber-100"
                                    >
                                      {label}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                                Nenhum produto vinculado
                              </span>
                            )}
                          </div>

                          {/* Ferramentas */}
                          {s.ferramentas && s.ferramentas.trim().length > 0 && (
                            <div>
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1.5">
                                Ferramentas Necessárias:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {s.ferramentas
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter(Boolean)
                                  .map((tool, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                                    >
                                      {tool}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  /* ── MOBILE LIST ────────────────────────────────────────────────── */
  function renderMobileList() {
    return (
      <ul className="flex flex-col gap-2 md:hidden">
        {filteredServices.map((s) => {
          const isExpanded = !!expandedServiceIds[s.id];
          return (
            <li
              key={s.id}
              onClick={() => toggleRow(s.id)}
              className="flex flex-col cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex gap-3">
                <ServiceAvatar service={s} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-tight text-zinc-900 dark:text-zinc-50">
                    {s.nome}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    Valor {formatBRL(s.valor)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Noturno: {formatBRL(s.valorNoturno)}</span>
                    <span>Gastos: {formatBRL(s.gastosEstimados)}</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <SegmentBadges service={s} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1 self-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setViewPartnersService(s)}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    title="Ver prestadores"
                    aria-label="Ver prestadores vinculados"
                  >
                    <UsersIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal(s)}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    aria-label="Editar serviço"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteService(s.id)}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    aria-label="Deletar serviço"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Mobile Expanded Details */}
              {isExpanded && (
                <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800 space-y-3" onClick={(e) => e.stopPropagation()}>
                  {s.observacoes && (
                    <div className="text-xs">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                        Observações:
                      </span>
                      <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400">
                        {s.observacoes}
                      </p>
                    </div>
                  )}

                  {/* Produtos */}
                  <div className="text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                      Produtos Usados no Serviço:
                    </span>
                    {s.produtoIds && s.produtoIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {s.produtoIds.map((pid) => {
                          const label = produtoById.get(pid)?.nome ?? "Produto removido";
                          return (
                            <span
                              key={pid}
                              className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-950 dark:bg-amber-950/80 dark:text-amber-100"
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">
                        Nenhum produto vinculado
                      </span>
                    )}
                  </div>
{/* Ferramentas */}
{s.ferramentas && s.ferramentas.trim().length > 0 && (
  <div className="text-xs">
    <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">Ferramentas Necessárias:</span>
    <div className="flex flex-wrap gap-1">
      {s.ferramentas
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((tool, tIdx) => (
          <span
            key={tIdx}
            className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
          >
            {tool}
          </span>
        ))}
    </div>
  </div>
)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  /* ── empty state ────────────────────────────────────────────────── */
  if (!loading && services.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 pb-28">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Cadastro local — vincule prestadores (parceiros) e produtos do catálogo
          usados em cada serviço.
        </p>
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-950/60">
            <PlusIcon className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nenhum serviço cadastrado
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Adicione serviços residenciais ou automotivos para começar.
          </p>
          <button
            type="button"
            onClick={() => openModal()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 active:bg-sky-800"
          >
            <PlusIcon className="h-4 w-4" />
            Adicionar serviço
          </button>
        </div>

        {/* Modal */}
        {modalOpen && renderModal()}
      </div>
    );
  }

  /* ── MODAL ──────────────────────────────────────────────────────── */
  function renderModal() {
    return (
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
          className="max-h-[min(92dvh,720px)] w-full overflow-hidden rounded-t-2xl border border-zinc-200 bg-background shadow-2xl dark:border-zinc-800 sm:mx-auto sm:max-w-md sm:rounded-2xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex max-h-[inherit] flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h3
                id={titleId}
                className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
              >
                {modalMode === "edit" ? "Editar serviço" : "Novo serviço"}
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
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div
                id={descId}
                className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
              >
                {formError ? (
                  <p
                    className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
                    role="alert"
                  >
                    {formError}
                  </p>
                ) : null}

                <div>
                  <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Foto{" "}
                    <span className="font-normal text-zinc-500">(opcional)</span>
                  </span>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
                      {form.fotoDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.fotoDataUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                          —
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onPickPhoto}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Escolher foto
                      </button>
                      {form.fotoDataUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({ ...f, fotoDataUrl: "" }))
                          }
                          className="text-left text-xs text-red-600 hover:underline dark:text-red-400"
                        >
                          Remover foto
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Nome
                  </span>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nome: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none ring-sky-500/40 focus:border-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    placeholder="Ex.: Abertura residencial"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Valor
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.valor}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valor: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    placeholder="0,00"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Valor noturno{" "}
                    <span className="font-normal text-zinc-500">(opcional)</span>
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.valorNoturno}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valorNoturno: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    placeholder="0,00 — vazio = R$ 0,00"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Gastos estimados{" "}
                    <span className="font-normal text-zinc-500">(opcional)</span>
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.gastosEstimados}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        gastosEstimados: e.target.value,
                      }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    placeholder="0,00 — vazio = R$ 0,00"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Observações
                  </span>
                  <textarea
                    value={form.observacoes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, observacoes: e.target.value }))
                    }
                    rows={3}
                    className="mt-1.5 w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    placeholder="Detalhes, prazos, inclusões…"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Ferramentas{" "}
                    <span className="font-normal text-zinc-500">(opcional, separadas por vírgula)</span>
                  </span>
                  <input
                    type="text"
                    value={form.ferramentas}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ferramentas: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    placeholder="Ex.: Chave Phillips, Ferro de solda, Estilete"
                  />
                </label>

                <fieldset className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                  <legend className="px-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Prestadores de serviço
                  </legend>
                  <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Marque os parceiros que realizam este serviço. Cadastre
                    parceiros em &quot;Parceiros&quot; se a lista estiver vazia.
                  </p>
                  {partners.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Nenhum parceiro cadastrado.
                    </p>
                  ) : (
                    <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
                      {partners.map((p) => (
                        <li key={p.id}>
                          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                            <input
                              type="checkbox"
                              checked={form.prestadorIds.includes(p.id)}
                              onChange={() =>
                                setForm((f) => ({
                                  ...f,
                                  prestadorIds: toggleId(
                                    f.prestadorIds,
                                    p.id
                                  ),
                                }))
                              }
                              className="h-4 w-4 rounded border-zinc-400 text-sky-600 focus:ring-sky-500"
                            />
                            <span className="min-w-0 text-[15px] text-zinc-800 dark:text-zinc-200">
                              {p.nome}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </fieldset>

                <fieldset className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                  <legend className="px-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Produtos usados no serviço
                  </legend>
                  <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Marque itens como miolos, chips ou chaves. Cadastre-os em
                    &quot;Produtos&quot; se a lista estiver vazia.
                  </p>
                  {produtos.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Nenhum produto no catálogo.
                    </p>
                  ) : (
                    <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
                      {produtos.map((pr) => (
                        <li key={pr.id}>
                          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                            <input
                              type="checkbox"
                              checked={form.produtoIds.includes(pr.id)}
                              onChange={() =>
                                setForm((f) => ({
                                  ...f,
                                  produtoIds: toggleId(f.produtoIds, pr.id),
                                }))
                              }
                              className="h-4 w-4 rounded border-zinc-400 text-amber-600 focus:ring-amber-500"
                            />
                            <span className="min-w-0 text-[15px] text-zinc-800 dark:text-zinc-200">
                              {pr.nome}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </fieldset>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Segmentos
                  </span>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
                    <input
                      type="checkbox"
                      checked={form.automotivo}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, automotivo: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-zinc-400 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-[15px] text-zinc-800 dark:text-zinc-200">
                      Automotivo
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
                    <input
                      type="checkbox"
                      checked={form.residencial}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          residencial: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-zinc-400 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-[15px] text-zinc-800 dark:text-zinc-200">
                      Residencial
                    </span>
                  </label>
                </div>
              </div>

              <div className="shrink-0 border-t border-zinc-200 p-4 dark:border-zinc-800">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-600 text-base font-semibold text-white hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Salvando..." : "Salvar serviço"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ── PARTNERS MODAL ─────────────────────────────────────────────── */
  function renderPartnersModal() {
    if (!viewPartnersService) return null;
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/50 sm:items-center sm:justify-center sm:p-4"
        role="presentation"
        onMouseDown={() => setViewPartnersService(null)}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="max-h-[min(92dvh,480px)] w-full overflow-hidden rounded-t-2xl border border-zinc-200 bg-background shadow-2xl dark:border-zinc-800 sm:mx-auto sm:max-w-md sm:rounded-2xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex max-h-[inherit] flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Prestadores de: {viewPartnersService.nome}
              </h3>
              <button
                type="button"
                onClick={() => setViewPartnersService(null)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {viewPartnersService.prestadorIds && viewPartnersService.prestadorIds.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {viewPartnersService.prestadorIds.map((pid) => {
                    const partner = partnerById.get(pid);
                    const name = partner?.nome ?? "Parceiro removido";
                    return (
                      <div
                        key={pid}
                        className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 px-3 py-2.5 dark:border-zinc-800/50 dark:bg-zinc-900/20"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 font-bold text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {name}
                          </p>
                          {partner?.endereco && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {partner.endereco}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400 italic">
                  Nenhum prestador vinculado a este serviço.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 pb-28">
      {/* header row */}
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Cadastro local — vincule prestadores (parceiros) e produtos do catálogo
          usados em cada serviço.
        </p>
        <button
          type="button"
          onClick={() => openModal()}
          className="hidden shrink-0 items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 active:bg-sky-800 md:inline-flex"
        >
          <PlusIcon className="h-4 w-4" />
          Adicionar serviço
        </button>
      </div>

      {/* segment filters */}
      <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50/50 p-1 dark:border-zinc-800 dark:bg-zinc-900/30 self-start">
        <button
          type="button"
          onClick={() => setSegmentFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            segmentFilter === "all"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Todos
        </button>
        <button
          type="button"
          onClick={() => setSegmentFilter("automotivo")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            segmentFilter === "automotivo"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Automotivo
        </button>
        <button
          type="button"
          onClick={() => setSegmentFilter("residencial")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            segmentFilter === "residencial"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Residencial
        </button>
      </div>

      {/* desktop table */}
      {renderDesktopTable()}

      {/* mobile list */}
      {renderMobileList()}

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden dark:border-zinc-800">
        <div className="mx-auto w-full max-w-lg">
          <button
            type="button"
            onClick={() => openModal()}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-600 text-base font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 active:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            Adicionar serviço
          </button>
        </div>
      </div>

      {/* modal */}
      {modalOpen && renderModal()}
      {viewPartnersService && renderPartnersModal()}
    </div>
  );
}
