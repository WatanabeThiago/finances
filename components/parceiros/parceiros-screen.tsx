"use client";

import Link from "next/link";
import type { Partner } from "@/lib/partner";
import {
  appendPartner,
  updatePartner,
  parsePartnersJson,
  partnersStorageSnapshot,
  subscribePartners,
} from "@/lib/partner";
import type { VendaLg } from "@/lib/venda-lg";
import { parseVendasLgJson } from "@/lib/venda-lg";
import { formatBRL } from "@/lib/money";
import {
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

function parseCoord(value: string): number | undefined {
  const t = value.trim();
  if (!t) return undefined;
  const n = Number.parseFloat(t.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

// Geocodification using OpenStreetMap Nominatim
async function geocodeAddress(
  address: string
): Promise<{ latitude: string; longitude: string } | null> {
  if (!address.trim()) return null;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      {
        headers: {
          "Accept-Language": "pt-BR",
        },
      }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as Array<{
      lat: string;
      lon: string;
    }>;

    if (data.length === 0) return null;

    return {
      latitude: data[0].lat,
      longitude: data[0].lon,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

type FormState = {
  fotoDataUrl: string;
  nome: string;
  endereco: string;
  latitude: string;
  longitude: string;
  automotivo: boolean;
  residencial: boolean;
};

const emptyForm = (): FormState => ({
  fotoDataUrl: "",
  nome: "",
  endereco: "",
  latitude: "",
  longitude: "",
  automotivo: false,
  residencial: false,
});

type ModalMode = "create" | "edit";

// Helper to convert API response to Partner format
function normalizePartners(data: any[]): Partner[] {
  return data.map((p: any) => ({
    ...p,
    latitude: typeof p.latitude === "string" ? parseFloat(p.latitude) : p.latitude,
    longitude: typeof p.longitude === "string" ? parseFloat(p.longitude) : p.longitude,
  }));
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function PartnerAvatar({
  partner,
  size = "md",
}: {
  partner: Partner;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  return (
    <div
      className={`relative ${dim} shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800`}
    >
      {partner.fotoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={partner.fotoDataUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          {partner.nome.trim().charAt(0).toUpperCase() || "?"}
        </div>
      )}
    </div>
  );
}

function SegmentBadges({ partner }: { partner: Partner }) {
  return (
    <div className="flex flex-wrap gap-1">
      {partner.automotivo && (
        <span className="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-400/20">
          Automotivo
        </span>
      )}
      {partner.residencial && (
        <span className="inline-flex items-center rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-400/20">
          Residencial
        </span>
      )}
      {!partner.automotivo && !partner.residencial && (
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">—</span>
      )}
    </div>
  );
}

function getPartnerFaturamento(partnerId: string, vendas: VendaLg[]): number {
  return vendas
    .filter((v) => v.prestadorId === partnerId)
    .reduce((acc, v) => {
      const total = v.linhas.reduce((s, l) => s + l.preco * l.quantidade, 0);
      return acc + (total - (v.comissao || 0));
    }, 0);
}

export function ParceirosScreen() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [vendas, setVendas] = useState<VendaLg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [segmentFilter, setSegmentFilter] = useState<"all" | "automotivo" | "residencial">("all");

  // Fetch partners and sales from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [partnersRes, vendasRes] = await Promise.all([
          fetch("/api/parceiros"),
          fetch("/api/vendas-lg"),
        ]);

        if (!partnersRes.ok) throw new Error("Falha ao carregar parceiros");
        const partnersData = await partnersRes.json();
        setPartners(normalizePartners(partnersData));

        if (vendasRes.ok) {
          const vendasData = await vendasRes.json();
          // Normalize numeric values from API
          const normalizedVendas = vendasData.map((v: any) => ({
            ...v,
            comissao: typeof v.comissao === "string" ? parseFloat(v.comissao) : v.comissao,
            linhas: Array.isArray(v.linhas) ? v.linhas.map((l: any) => ({
              ...l,
              precoOriginal: typeof l.precoOriginal === "string" ? parseFloat(l.precoOriginal) : l.precoOriginal,
              preco: typeof l.preco === "string" ? parseFloat(l.preco) : l.preco,
              quantidade: typeof l.quantidade === "string" ? parseInt(l.quantidade, 10) : l.quantidade,
            })) : [],
          }));
          setVendas(normalizedVendas);
        }

        setError(null);
      } catch (err) {
        setError("Erro ao carregar parceiros");
        // Fallback to localStorage
        const localPartners = localStorage.getItem("finances.parceiros.v1");
        if (localPartners) {
          setPartners(parsePartnersJson(localPartners));
        }
        const localVendas = localStorage.getItem("finances.vendas-lg.v1");
        if (localVendas) {
          setVendas(parseVendasLgJson(localVendas));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descId = useId();

  const openModal = useCallback((partnerToEdit?: Partner) => {
    // Always reset to create mode first
    setModalMode("create");
    setEditingPartnerId(null);
    setFormError(null);
    console.log('openModal called with partnerToEdit:', partnerToEdit);
    if (partnerToEdit) {
      setModalMode("edit");
      setEditingPartnerId(partnerToEdit.id);
      setForm({
        fotoDataUrl: partnerToEdit.fotoDataUrl ?? "",
        nome: partnerToEdit.nome,
        endereco: partnerToEdit.endereco,
        latitude: partnerToEdit.latitude !== undefined ? partnerToEdit.latitude.toString().replace(".", ",") : "",
        longitude: partnerToEdit.longitude !== undefined ? partnerToEdit.longitude.toString().replace(".", ",") : "",
        automotivo: partnerToEdit.automotivo,
        residencial: partnerToEdit.residencial,
      });
    } else {
      setForm(emptyForm());
    }
    setModalOpen(true);
  }, []);

  // Reset state when modal closes
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setFormError(null);
    setEditingPartnerId(null);
    setModalMode("create");
  }, []);


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

  const handleGeocode = useCallback(async () => {
    const address = form.endereco.trim();
    if (!address) {
      setFormError("Por favor, preencha o endereço primeiro");
      return;
    }

    setGeoLoading(true);
    try {
      const coords = await geocodeAddress(address);
      if (coords) {
        setForm((f) => ({
          ...f,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }));
        setFormError(null);
      } else {
        setFormError("Não foi possível encontrar as coordenadas para este endereço");
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      setFormError("Erro ao buscar coordenadas");
    } finally {
      setGeoLoading(false);
    }
  }, [form.endereco]);

  const [submitting, setSubmitting] = useState(false);
  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const nome = form.nome.trim();
      const endereco = form.endereco.trim();
      if (!nome) {
        setFormError("Informe o nome do parceiro.");
        return;
      }
      const lat = parseCoord(form.latitude);
      const lng = parseCoord(form.longitude);
      if (
        (lat !== undefined && lng === undefined) ||
        (lat === undefined && lng !== undefined)
      ) {
        setFormError("Preencha latitude e longitude, ou deixe os dois vazios.");
        return;
      }
      setSubmitting(true);
      try {
        const url = modalMode === "edit"
          ? `/api/parceiros/${editingPartnerId}`
          : "/api/parceiros";
        const method = modalMode === "edit" ? "PUT" : "POST";
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome,
            endereco,
            automotivo: form.automotivo,
            residencial: form.residencial,
            latitude: lat,
            longitude: lng,
            fotoDataUrl: form.fotoDataUrl || null,
          }),
        });
        if (!response.ok) {
          throw new Error("Falha ao salvar parceiro");
        }
        // Refresh the partners list
        const refreshResponse = await fetch("/api/parceiros");
        if (refreshResponse.ok) {
          const updatedPartners = await refreshResponse.json();
          setPartners(normalizePartners(updatedPartners));
        }
        closeModal();
      } catch (err) {
        setFormError("Erro ao salvar parceiro. Tente novamente.");
      } finally {
        setSubmitting(false);
      }
    },
    [form, closeModal, modalMode, editingPartnerId]
  );

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    if (!modalOpen) return;
    const onPaste = (ev: ClipboardEvent) => {
      const items = ev.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (!item.type.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            setForm((f) => ({ ...f, fotoDataUrl: reader.result as string }));
            setFormError(null);
          }
        };
        reader.readAsDataURL(file);
        ev.preventDefault();
        break;
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [modalOpen]);

  const deletePartner = useCallback(
    async (id: string) => {
      if (!confirm("Tem certeza que deseja deletar este parceiro?")) return;
      try {
        const response = await fetch(`/api/parceiros/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Falha ao deletar parceiro");
        }
        // Refresh the partners list
        const refreshResponse = await fetch("/api/parceiros");
        if (refreshResponse.ok) {
          const updatedPartners = await refreshResponse.json();
          setPartners(normalizePartners(updatedPartners));
        }
      } catch (err) {
        alert("Erro ao deletar parceiro");
      }
    },
    []
  );

  const filteredPartners = useMemo(() => {
    const list = partners.filter((p) => {
      if (segmentFilter === "automotivo") return p.automotivo;
      if (segmentFilter === "residencial") return p.residencial;
      return true;
    });

    return [...list].sort((a, b) => {
      const fatA = getPartnerFaturamento(a.id, vendas);
      const fatB = getPartnerFaturamento(b.id, vendas);
      return fatB - fatA;
    });
  }, [partners, segmentFilter, vendas]);

  function renderDesktopTable() {
    return (
      <div className="hidden md:block overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/60">
              <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Parceiro
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Endereço
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Segmento
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Faturamento
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {filteredPartners.map((p, index) => {
              const isEven = index % 2 === 0;
              const faturamento = getPartnerFaturamento(p.id, vendas);
              return (
                <tr
                  key={p.id}
                  className={`group transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70 ${
                    isEven ? "bg-white dark:bg-zinc-950" : "bg-zinc-50 dark:bg-zinc-900/40"
                  }`}
                >
                  {/* Parceiro */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/parceiros/${p.id}`}
                      className="flex items-center gap-3 group/link hover:underline decoration-sky-500"
                    >
                      <PartnerAvatar partner={p} size="sm" />
                      <span className="font-medium text-zinc-900 dark:text-zinc-50 group-hover/link:text-sky-600 dark:group-hover/link:text-sky-400">
                        {p.nome}
                      </span>
                    </Link>
                  </td>
                  {/* Endereço */}
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 max-w-xs truncate">
                    {p.endereco || "—"}
                  </td>
                  {/* Segmento */}
                  <td className="px-4 py-3">
                    <SegmentBadges partner={p} />
                  </td>
                  {/* Faturamento */}
                  <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatBRL(faturamento)}
                  </td>
                  {/* Ações */}
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openModal(p)}
                        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        aria-label="Editar parceiro"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePartner(p.id)}
                        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        aria-label="Deletar parceiro"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderMobileList() {
    return (
      <ul className="flex flex-col gap-2 md:hidden">
        {filteredPartners.map((p) => {
          const faturamento = getPartnerFaturamento(p.id, vendas);
          return (
            <li
              key={p.id}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex gap-3">
                <Link href={`/parceiros/${p.id}`}>
                  <PartnerAvatar partner={p} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/parceiros/${p.id}`} className="hover:underline decoration-sky-500">
                    <p className="font-semibold leading-tight text-zinc-900 dark:text-zinc-50 hover:text-sky-600 dark:hover:text-sky-400">
                      {p.nome}
                    </p>
                  </Link>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {p.endereco || "Sem endereço cadastrado"}
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Faturamento: {formatBRL(faturamento)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <SegmentBadges partner={p} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1 self-center">
                  <button
                    type="button"
                    onClick={() => openModal(p)}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    aria-label="Editar parceiro"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePartner(p.id)}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    aria-label="Deletar parceiro"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 pb-28">
      {/* header row */}
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Cadastro local neste dispositivo — sem servidor por enquanto.
        </p>
        <button
          type="button"
          onClick={() => openModal()}
          className="hidden shrink-0 items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 active:bg-sky-800 md:inline-flex"
        >
          <PlusIcon className="h-4 w-4" />
          Adicionar parceiro
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

      {loading ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Carregando parceiros...
          </p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-yellow-300 bg-yellow-50/80 px-4 py-4 dark:border-yellow-700 dark:bg-yellow-900/40">
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
            ⚠️ {error}
          </p>
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nenhum parceiro encontrado
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Toque em &quot;Adicionar parceiro&quot; para cadastrar.
          </p>
        </div>
      ) : (
        <>
          {renderDesktopTable()}
          {renderMobileList()}
        </>
      )}

      {/* mobile fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden dark:border-zinc-800">
        <div className="mx-auto w-full max-w-lg">
          <button
            type="button"
            onClick={() => openModal()}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-600 text-base font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 active:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            Adicionar parceiro
          </button>
        </div>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/50 sm:justify-center sm:p-4"
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
                  {modalMode === "edit" ? "Editar parceiro" : "Novo parceiro"}
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
                      Foto de perfil{" "}
                      <span className="font-normal text-zinc-500">(opcional)</span>
                    </span>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
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
                      <div className="flex flex-col gap-1.5">
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
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          ou <kbd className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11px] dark:bg-zinc-800">Ctrl+V</kbd> para colar
                        </p>
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
                      autoComplete="name"
                      className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none ring-sky-500/40 focus:border-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                      placeholder="Nome do parceiro"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      Endereço
                    </span>
                    <div className="mt-1.5 flex gap-2">
                      <textarea
                        value={form.endereco}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, endereco: e.target.value }))
                        }
                        rows={3}
                        className="flex-1 resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none ring-sky-500/40 focus:border-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                        placeholder="Rua, número, bairro, cidade…"
                      />
                      <button
                        type="button"
                        onClick={handleGeocode}
                        disabled={geoLoading || !form.endereco.trim()}
                        className="rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-zinc-300 disabled:cursor-not-allowed dark:disabled:bg-zinc-700 h-fit"
                      >
                        {geoLoading ? "🔍 Buscando..." : "🔍 Buscar"}
                      </button>
                    </div>
                  </label>

                  <fieldset className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                    <legend className="px-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      Coordenadas{" "}
                      <span className="font-normal text-zinc-500">
                        (opcional, para automações)
                      </span>
                    </legend>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          Latitude
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.latitude}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, latitude: e.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                          placeholder="-23.5505"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          Longitude
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.longitude}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, longitude: e.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                          placeholder="-46.6333"
                        />
                      </label>
                    </div>
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
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-600 text-base font-semibold text-white hover:bg-sky-700 active:bg-sky-800"
                  >
                    Salvar parceiro
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
