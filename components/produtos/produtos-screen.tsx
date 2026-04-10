"use client";

import { formatBRL } from "@/lib/money";
import type { Produto } from "@/lib/produto";
import {
  parseProdutosJson,
} from "@/lib/produto";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

function newId(): string {
  return crypto.randomUUID();
}

type FormState = {
  fotoDataUrl: string;
  nome: string;
  valorCompra: string;
  residencial: boolean;
  automotivo: boolean;
};

const emptyForm = (): FormState => ({
  fotoDataUrl: "",
  nome: "",
  valorCompra: "",
  residencial: false,
  automotivo: false,
});

type ModalMode = "create" | "edit";

// Helper to convert API response to Produto format
function normalizeProdutos(data: any[]): Produto[] {
  return data.map((p: any) => ({
    ...p,
    valorCompra: typeof p.valor === "string" ? parseFloat(p.valor) : (p.valor || p.valorCompra),
  }));
}

export function ProdutosScreen() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch produtos from API
  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/produtos");
        if (!response.ok) throw new Error("Falha ao carregar produtos");
        const data = await response.json();
        setProdutos(normalizeProdutos(data));
        setError(null);
      } catch (err) {
        console.error("Error fetching produtos:", err);
        setError("Erro ao carregar produtos");
        // Fallback to localStorage
        const localData = localStorage.getItem("finances.produtos.v1");
        if (localData) {
          setProdutos(parseProdutosJson(localData));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProdutos();
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingProdutoId, setEditingProdutoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const titleId = useId();
  const descId = useId();

  const openModal = useCallback((produtoToEdit?: Produto) => {
    // Always reset to create mode first
    setModalMode("create");
    setEditingProdutoId(null);
    setFormError(null);
    
    if (produtoToEdit) {
      setModalMode("edit");
      setEditingProdutoId(produtoToEdit.id);
      setForm({
        fotoDataUrl: produtoToEdit.fotoDataUrl ?? "",
        nome: produtoToEdit.nome,
        valorCompra: produtoToEdit.valorCompra.toString(),
        residencial: produtoToEdit.residencial,
        automotivo: produtoToEdit.automotivo,
      });
    } else {
      setForm(emptyForm());
    }
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setFormError(null);
    setEditingProdutoId(null);
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

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const nome = form.nome.trim();
      if (!nome) {
        setFormError("Informe o nome do produto.");
        return;
      }
      const valorCompra = parseFloat(form.valorCompra) || 0;
      if (valorCompra < 0) {
        setFormError("O valor de compra não pode ser negativo.");
        return;
      }

      setSubmitting(true);
      try {
        const url = modalMode === "edit" 
          ? `/api/produtos/${editingProdutoId}`
          : "/api/produtos";
        
        const method = modalMode === "edit" ? "PUT" : "POST";
        
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome,
            valorCompra,
            fotoDataUrl: form.fotoDataUrl || null,
            automotivo: form.automotivo,
            residencial: form.residencial,
          }),
        });

        if (!response.ok) {
          throw new Error("Falha ao salvar produto");
        }

        // Refresh the produtos list
        const refreshResponse = await fetch("/api/produtos");
        if (refreshResponse.ok) {
          const updatedProdutos = await refreshResponse.json();
          setProdutos(normalizeProdutos(updatedProdutos));
        }

        closeModal();
      } catch (err) {
        console.error("Error submitting produto:", err);
        setFormError("Erro ao salvar produto. Tente novamente.");
      } finally {
        setSubmitting(false);
      }
    },
    [form, closeModal, modalMode, editingProdutoId]
  );

  const deleteProduto = useCallback(
    async (id: string) => {
      if (!confirm("Tem certeza que deseja deletar este produto?")) return;
      
      try {
        const response = await fetch(`/api/produtos/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Falha ao deletar produto");
        }

        // Refresh the produtos list
        const refreshResponse = await fetch("/api/produtos");
        if (refreshResponse.ok) {
          const updatedProdutos = await refreshResponse.json();
          setProdutos(normalizeProdutos(updatedProdutos));
        }
      } catch (err) {
        console.error("Error deleting produto:", err);
        alert("Erro ao deletar produto");
      }
    },
    []
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
    if (produtos.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nenhum produto no catálogo
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Cadastre miolos, chips, chaves e outros itens usados nos serviços.
          </p>
        </div>
      );
    }
    return (
      <ul className="flex flex-col gap-2">
        {produtos.map((p) => (
          <li
            key={p.id}
            className="flex gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950/60">
              {p.fotoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URLs do upload local
                <img
                  src={p.fotoDataUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {p.nome.trim().charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-tight text-zinc-900 dark:text-zinc-50">
                {p.nome}
              </p>
              <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                Compra {formatBRL(p.valorCompra)}
              </p>
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
              aria-label="Editar produto"
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
  }, [produtos, openModal]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 pb-28">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Itens de consumo ou peças que entram nos serviços. Depois você marca
        quais deles cada serviço utiliza.
      </p>

      {listContent}

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:border-zinc-800">
        <div className="mx-auto w-full max-w-lg">
          <button
            type="button"
            onClick={() => openModal()}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-600 text-base font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 active:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            Adicionar produto
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
            className="max-h-[min(92dvh,640px)] w-full overflow-hidden rounded-t-2xl border border-zinc-200 bg-background shadow-2xl dark:border-zinc-800 sm:max-w-md sm:rounded-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex max-h-[inherit] flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <h3
                  id={titleId}
                  className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  {modalMode === "edit" ? "Editar produto" : "Novo produto"}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Fechar
                </button>
              </div>
              <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
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
                      className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                      placeholder="Ex.: Miolos, chip transponder, chave simples…"
                      autoFocus
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      Valor de compra
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.valorCompra}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, valorCompra: e.target.value }))
                      }
                      className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                      placeholder="0,00 — vazio = R$ 0,00"
                    />
                  </label>

                  <div className="space-y-2">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      Segmentos
                    </span>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={form.automotivo}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            automotivo: e.target.checked,
                          }))
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
                    Salvar produto
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
