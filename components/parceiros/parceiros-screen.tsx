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

export function ParceirosScreen() {
  const raw = useSyncExternalStore(
    subscribePartners,
    partnersStorageSnapshot,
    () => "[]"
  );
  const partners = useMemo(() => parsePartnersJson(raw), [raw]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descId = useId();

  const openModal = useCallback((partnerToEdit?: Partner) => {
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
      setModalMode("create");
      setEditingPartnerId(null);
      setForm(emptyForm());
    }
    setFormError(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setFormError(null);
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

  const submit = useCallback(
    (e: React.FormEvent) => {
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

      const partner: Partner = {
        id: modalMode === "edit" && editingPartnerId ? editingPartnerId : newId(),
        nome,
        endereco,
        automotivo: form.automotivo,
        residencial: form.residencial,
        ...(lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : {}),
        ...(form.fotoDataUrl ? { fotoDataUrl: form.fotoDataUrl } : {}),
      };

      if (modalMode === "edit") {
        updatePartner(partner);
      } else {
        appendPartner(partner);
      }
      closeModal();
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

  const listContent = useMemo(() => {
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
              {p.latitude !== undefined && p.longitude !== undefined ? (
                <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-500">
                  {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
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
            onClick={openModal}
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
                      autoComplete="name"
                      className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none ring-sky-500/40 focus:border-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                      placeholder="Nome do parceiro"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      Endereço
                    </span>
                    <textarea
                      value={form.endereco}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, endereco: e.target.value }))
                      }
                      rows={3}
                      className="mt-1.5 w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none ring-sky-500/40 focus:border-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                      placeholder="Rua, número, bairro, cidade…"
                    />
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
