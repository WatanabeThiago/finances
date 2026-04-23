"use client";

import type { Partner } from "@/lib/partner";
import {
  appendPartner,
  updatePartner,
  parsePartnersJson,
  partnersStorageSnapshot,
  subscribePartners,
} from "@/lib/partner";
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

export function ParceirosScreen() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch partners from API
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/parceiros");
        if (!response.ok) throw new Error("Falha ao carregar parceiros");
        const data = await response.json();
        setPartners(normalizePartners(data));
        setError(null);
      } catch (err) {
        setError("Erro ao carregar parceiros");
        // Fallback to localStorage
        const localData = localStorage.getItem("finances.parceiros.v1");
        if (localData) {
          setPartners(parsePartnersJson(localData));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPartners();
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

  const listContent = useMemo(() => {
    if (loading) {
      return (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Carregando parceiros...
          </p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="rounded-2xl border border-dashed border-yellow-300 bg-yellow-50/80 px-4 py-4 dark:border-yellow-700 dark:bg-yellow-900/40">
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
            ⚠️ {error}
          </p>
        </div>
      );
    }
    if (partners.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nenhum parceiro ainda
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Toque em &quot;Adicionar parceiro&quot; para cadastrar o primeiro.
          </p>
        </div>
      );
    }
    return (
      <ul className="flex flex-col gap-3">
        {partners.map((p) => (
          <li
            key={p.id}
            className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              {p.fotoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URLs do upload local
                <img
                  src={p.fotoDataUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-zinc-500 dark:text-zinc-400">
                  {p.nome.trim().charAt(0).toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
                {p.nome}
              </p>
              {p.endereco ? (
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {p.endereco}
                </p>
              ) : null}
              {p.latitude != null && p.longitude != null ? (
                <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-500">
                  {Number(p.latitude).toFixed(5)}, {Number(p.longitude).toFixed(5)}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.automotivo ? (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900 dark:bg-sky-950/80 dark:text-sky-200">
                    Automotivo
                  </span>
                ) : null}
                {p.residencial ? (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900 dark:bg-violet-950/80 dark:text-violet-200">
                    Residencial
                  </span>
                ) : null}
                {!p.automotivo && !p.residencial ? (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    Sem segmento marcado
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => openModal(p)}
              className="ml-2 shrink-0 self-center rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              aria-label="Editar parceiro"
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
            <button
              type="button"
              onClick={() => deletePartner(p.id)}
              className="shrink-0 self-center rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
              aria-label="Deletar parceiro"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    );
}, [partners, openModal]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 pb-28">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Cadastro local neste dispositivo — sem servidor por enquanto.
      </p>

      {listContent}

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:border-zinc-800">
        <div className="mx-auto w-full max-w-lg">
          <button
            type="button"
            onClick={() => openModal()}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-600 text-base font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 active:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500 dark:active:bg-sky-600"
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
