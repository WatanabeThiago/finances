"use client";

import { formatBRL } from "@/lib/money";
import type { Produto, ProdutoLink } from "@/lib/produto";
import { parseProdutosJson } from "@/lib/produto";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

/* ── helpers ─────────────────────────────────────────────────────────── */

type FormState = {
  fotoDataUrl: string;
  nome: string;
  valorCompra: string;
  residencial: boolean;
  automotivo: boolean;
  linkSelecionadoId?: string;
};

const emptyForm = (): FormState => ({
  fotoDataUrl: "",
  nome: "",
  valorCompra: "",
  residencial: false,
  automotivo: false,
  linkSelecionadoId: undefined,
});

type LinkForm = {
  url: string;
  fornecedor: string;
  preco: string;
  quantidade: string;
  frete: string;
};

const emptyLinkForm = (): LinkForm => ({
  url: "",
  fornecedor: "",
  preco: "",
  quantidade: "1",
  frete: "",
});

type ModalMode = "create" | "edit";

function normalizeProdutos(data: any[]): Produto[] {
  return data.map((p: any) => ({
    ...p,
    valorCompra:
      typeof p.valor === "string"
        ? parseFloat(p.valor)
        : p.valor || p.valorCompra,
    linksCount:
      typeof p.linksCount === "string"
        ? parseInt(p.linksCount, 10)
        : p.linksCount ?? 0,
    menorPreco:
      p.menorPreco != null
        ? typeof p.menorPreco === "string"
          ? parseFloat(p.menorPreco)
          : p.menorPreco
        : undefined,
  }));
}

function truncateUrl(url: string, max = 40): string {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > max ? display.slice(0, max) + "…" : display;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

function getMarketplaceName(url: string): string {
  if (!url) return "";
  try {
    const lower = url.toLowerCase();
    if (lower.includes("shopee.com")) return "Shopee";
    if (lower.includes("mercadolivre.com")) return "MeLi";
    if (lower.includes("aliexpress.com")) return "AliExpress";
    if (lower.includes("amazon.com")) return "Amazon";
    if (lower.includes("shein.com")) return "Shein";
    if (lower.includes("magazineluiza.com") || lower.includes("magalu.com")) return "Magalu";
    if (lower.includes("americanas.com")) return "Americanas";
    if (lower.includes("casasbahia.com")) return "Casas Bahia";
    if (lower.includes("kabum.com")) return "Kabum";
    
    const u = new URL(url);
    let host = u.hostname;
    if (host.startsWith("www.")) {
      host = host.substring(4);
    }
    return host;
  } catch {
    return "Link";
  }
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

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
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

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

function StarIcon({ className, solid }: { className?: string; solid?: boolean }) {
  if (solid) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.977-2.888a1 1 0 00-1.176 0l-3.977 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

/* ── avatar ───────────────────────────────────────────────────────────── */

function ProdutoAvatar({
  produto,
  size = "md",
}: {
  produto: Produto;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  return (
    <div
      className={`relative ${dim} shrink-0 overflow-hidden rounded-lg bg-amber-100 dark:bg-amber-950/60`}
    >
      {produto.fotoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={produto.fotoDataUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-amber-900 dark:text-amber-200">
          {produto.nome.trim().charAt(0).toUpperCase() || "?"}
        </div>
      )}
    </div>
  );
}

/* ── segment badges ──────────────────────────────────────────────────── */

function SegmentBadges({ produto }: { produto: Produto }) {
  return (
    <div className="flex flex-wrap gap-1">
      {produto.automotivo && (
        <span className="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-400/20">
          Automotivo
        </span>
      )}
      {produto.residencial && (
        <span className="inline-flex items-center rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-400/20">
          Residencial
        </span>
      )}
      {!produto.automotivo && !produto.residencial && (
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">—</span>
      )}
    </div>
  );
}

/* ── links badge ─────────────────────────────────────────────────────── */

function LinksBadge({ produto }: { produto: Produto }) {
  const count = produto.linksCount ?? 0;
  if (count === 0) {
    return (
      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
        Sem links
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700 dark:text-emerald-400">
      <LinkIcon className="h-3 w-3" />
      {count} {count === 1 ? "link" : "links"}
      {produto.menorPreco != null && (
        <span className="text-zinc-500 dark:text-zinc-400">
          · a partir de {formatBRL(produto.menorPreco)}
        </span>
      )}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

export function ProdutosScreen() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── segment filters ────────────────────────────────────────────── */
  const [segmentFilter, setSegmentFilter] = useState<"all" | "automotivo" | "residencial">("all");

  const filteredProdutos = useMemo(() => {
    if (segmentFilter === "automotivo") {
      return produtos.filter((p) => p.automotivo);
    }
    if (segmentFilter === "residencial") {
      return produtos.filter((p) => p.residencial);
    }
    return produtos;
  }, [produtos, segmentFilter]);

  /* ── expanded rows state ────────────────────────────────────────── */
  const [expandedProdutoIds, setExpandedProdutoIds] = useState<Record<string, boolean>>({});
  const [expandedLinks, setExpandedLinks] = useState<Record<string, { loading: boolean; data: ProdutoLink[] }>>({});

  /* ── fetch all ──────────────────────────────────────────────────── */
  const fetchProdutos = useCallback(async () => {
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
      const localData = localStorage.getItem("finances.produtos.v1");
      if (localData) setProdutos(parseProdutosJson(localData));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);

  /* ── fetch links for expanded row ───────────────────────────────── */
  const loadExpandedLinks = useCallback(async (produtoId: string) => {
    setExpandedLinks((prev) => ({
      ...prev,
      [produtoId]: { loading: true, data: prev[produtoId]?.data || [] },
    }));

    try {
      const response = await fetch(`/api/produtos/${produtoId}/links`);
      if (response.ok) {
        const data = await response.json();
        const normalized = data.map((l: any) => ({
          ...l,
          preco: typeof l.preco === "string" ? parseFloat(l.preco) : l.preco,
          quantidade: typeof l.quantidade === "string" ? parseInt(l.quantidade, 10) : l.quantidade || 1,
          frete: typeof l.frete === "string" ? parseFloat(l.frete) : l.frete || 0,
        }));
        setExpandedLinks((prev) => ({
          ...prev,
          [produtoId]: { loading: false, data: normalized },
        }));
      } else {
        throw new Error("Failed to load links");
      }
    } catch (err) {
      console.error("Error loading expanded links:", err);
      setExpandedLinks((prev) => ({
        ...prev,
        [produtoId]: { loading: false, data: prev[produtoId]?.data || [] },
      }));
    }
  }, []);

  const toggleRow = useCallback((produtoId: string) => {
    setExpandedProdutoIds((prev) => {
      const next = { ...prev, [produtoId]: !prev[produtoId] };
      if (next[produtoId]) {
        loadExpandedLinks(produtoId);
      }
      return next;
    });
  }, [loadExpandedLinks]);

  /* ── modal state ────────────────────────────────────────────────── */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingProdutoId, setEditingProdutoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const titleId = useId();
  const descId = useId();

  /* ── links state (in modal) ─────────────────────────────────────── */
  const [links, setLinks] = useState<ProdutoLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linkForm, setLinkForm] = useState<LinkForm>(emptyLinkForm());
  const [linkFormOpen, setLinkFormOpen] = useState(false);
  const [addingLink, setAddingLink] = useState(false);

  /* ── open / close modal ─────────────────────────────────────────── */
  const openModal = useCallback((produtoToEdit?: Produto) => {
    setModalMode("create");
    setEditingProdutoId(null);
    setFormError(null);
    setLinks([]);
    setLinkForm(emptyLinkForm());
    setLinkFormOpen(false);

    if (produtoToEdit) {
      setModalMode("edit");
      setEditingProdutoId(produtoToEdit.id);
      setForm({
        fotoDataUrl: produtoToEdit.fotoDataUrl ?? "",
        nome: produtoToEdit.nome,
        valorCompra: produtoToEdit.valorCompra.toString(),
        residencial: produtoToEdit.residencial,
        automotivo: produtoToEdit.automotivo,
        linkSelecionadoId: produtoToEdit.linkSelecionadoId,
      });
      // fetch links for this produto
      setLinksLoading(true);
      fetch(`/api/produtos/${produtoToEdit.id}/links`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data: any[]) =>
          setLinks(
            data.map((l) => ({
              ...l,
              preco:
                typeof l.preco === "string" ? parseFloat(l.preco) : l.preco,
              quantidade:
                typeof l.quantidade === "string" ? parseInt(l.quantidade, 10) : l.quantidade || 1,
              frete:
                typeof l.frete === "string" ? parseFloat(l.frete) : l.frete || 0,
            }))
          )
        )
        .catch(() => setLinks([]))
        .finally(() => setLinksLoading(false));
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
    setLinks([]);
    setLinkFormOpen(false);
  }, []);

  /* ── photo ──────────────────────────────────────────────────────── */
  const onPickPhoto = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    []
  );

  /* ── submit product ─────────────────────────────────────────────── */
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
        const url =
          modalMode === "edit"
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
            linkSelecionadoId: form.linkSelecionadoId || null,
          }),
        });

        if (!response.ok) throw new Error("Falha ao salvar produto");

        await fetchProdutos();
        closeModal();
      } catch (err) {
        console.error("Error submitting produto:", err);
        setFormError("Erro ao salvar produto. Tente novamente.");
      } finally {
        setSubmitting(false);
      }
    },
    [form, closeModal, modalMode, editingProdutoId, fetchProdutos]
  );

  /* ── select link as purchase price ───────────────────────────────── */
  const selectLink = useCallback(
    async (produto: Produto, linkId: string | null) => {
      try {
        const response = await fetch(`/api/produtos/${produto.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: produto.nome,
            valorCompra: String(produto.valorCompra),
            fotoDataUrl: produto.fotoDataUrl || null,
            automotivo: produto.automotivo,
            residencial: produto.residencial,
            linkSelecionadoId: linkId,
          }),
        });

        if (!response.ok) throw new Error("Falha ao selecionar link");

        await fetchProdutos();
        
        // If the edited modal is open, also sync the local form state
        if (editingProdutoId === produto.id) {
          setForm((f) => ({ ...f, linkSelecionadoId: linkId || undefined }));
        }
      } catch (err) {
        console.error("Error selecting link:", err);
      }
    },
    [fetchProdutos, editingProdutoId]
  );

  /* ── delete product ─────────────────────────────────────────────── */
  const deleteProduto = useCallback(
    async (id: string) => {
      if (!confirm("Tem certeza que deseja deletar este produto?")) return;
      try {
        const response = await fetch(`/api/produtos/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Falha ao deletar produto");
        await fetchProdutos();
      } catch (err) {
        console.error("Error deleting produto:", err);
        alert("Erro ao deletar produto");
      }
    },
    [fetchProdutos]
  );

  /* ── add link ───────────────────────────────────────────────────── */
  const addLink = useCallback(async () => {
    if (!editingProdutoId) return;
    const url = linkForm.url.trim();
    if (!url) return;

    setAddingLink(true);
    try {
      const response = await fetch(
        `/api/produtos/${editingProdutoId}/links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            fornecedor: linkForm.fornecedor.trim(),
            preco: parseFloat(linkForm.preco) || 0,
            quantidade: parseInt(linkForm.quantidade, 10) || 1,
            frete: parseFloat(linkForm.frete) || 0,
          }),
        }
      );
      if (!response.ok) throw new Error("Falha ao criar link");

      // refresh links
      const refreshRes = await fetch(
        `/api/produtos/${editingProdutoId}/links`
      );
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setLinks(
          data.map((l: any) => ({
            ...l,
            preco:
              typeof l.preco === "string" ? parseFloat(l.preco) : l.preco,
            quantidade:
              typeof l.quantidade === "string" ? parseInt(l.quantidade, 10) : l.quantidade || 1,
            frete:
              typeof l.frete === "string" ? parseFloat(l.frete) : l.frete || 0,
          }))
        );
      }
      setLinkForm(emptyLinkForm());
      setLinkFormOpen(false);
      // also refresh main list to update counts
      fetchProdutos();
    } catch (err) {
      console.error("Error adding link:", err);
    } finally {
      setAddingLink(false);
    }
  }, [editingProdutoId, linkForm, fetchProdutos]);

  /* ── delete link ────────────────────────────────────────────────── */
  const deleteLink = useCallback(
    async (linkId: string) => {
      if (!editingProdutoId) return;
      try {
        const response = await fetch(
          `/api/produtos/${editingProdutoId}/links?linkId=${linkId}`,
          { method: "DELETE" }
        );
        if (!response.ok) throw new Error("Falha ao deletar link");

        setLinks((prev) => prev.filter((l) => l.id !== linkId));
        fetchProdutos();
      } catch (err) {
        console.error("Error deleting link:", err);
      }
    },
    [editingProdutoId, fetchProdutos]
  );

  /* ── escape to close & paste image ──────────────────────────────── */
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeModal();
    };
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
    window.addEventListener("keydown", onKey);
    document.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("paste", onPaste);
    };
  }, [modalOpen, closeModal]);

  /* ── empty state ────────────────────────────────────────────────── */
  if (!loading && produtos.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 pb-28">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Itens de consumo ou peças que entram nos serviços. Depois você marca
          quais deles cada serviço utiliza.
        </p>
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-950/60">
            <PlusIcon className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nenhum produto no catálogo
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Cadastre miolos, chips, chaves e outros itens usados nos serviços.
          </p>
          <button
            type="button"
            onClick={() => openModal()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 active:bg-sky-800"
          >
            <PlusIcon className="h-4 w-4" />
            Adicionar produto
          </button>
        </div>

        {/* Modal */}
        {modalOpen && renderModal()}
      </div>
    );
  }

  /* ── DESKTOP TABLE ──────────────────────────────────────────────── */
  function renderDesktopTable() {
    return (
      <div className="hidden md:block overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/60">
              <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Produto
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Valor de Compra
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Segmento
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Links de Compra
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {filteredProdutos.map((p, index) => {
              const isEven = index % 2 === 0;
              const isExpanded = !!expandedProdutoIds[p.id];
              const linksData = expandedLinks[p.id];
              return (
                <Fragment key={p.id}>
                  <tr
                    onClick={() => toggleRow(p.id)}
                    className={`group cursor-pointer transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70 ${
                      isExpanded
                        ? "bg-zinc-100/40 dark:bg-zinc-900/30"
                        : isEven
                        ? "bg-white dark:bg-zinc-950"
                        : "bg-zinc-50 dark:bg-zinc-900/40"
                    }`}
                  >
                    {/* Produto */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProdutoAvatar produto={p} size="sm" />
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">
                          {p.nome}
                        </span>
                      </div>
                    </td>
                    {/* Valor */}
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {formatBRL(p.valorCompra)}
                    </td>
                    {/* Segmento */}
                    <td className="px-4 py-3">
                      <SegmentBadges produto={p} />
                    </td>
                    {/* Links */}
                    <td className="px-4 py-3">
                      <LinksBadge produto={p} />
                    </td>
                    {/* Ações */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(p);
                          }}
                          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          aria-label="Editar produto"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProduto(p.id);
                          }}
                          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          aria-label="Deletar produto"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row Links */}
                  {isExpanded && (
                    <tr className="bg-zinc-100/10 dark:bg-zinc-900/15">
                      <td colSpan={5} className="px-10 py-3">
                        {linksData?.loading ? (
                          <div className="flex items-center gap-2 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Carregando links…
                          </div>
                        ) : !linksData?.data || linksData.data.length === 0 ? (
                          <p className="py-3 text-xs text-zinc-400 dark:text-zinc-500">
                            Nenhum link de compra cadastrado para este produto.
                          </p>
                        ) : (
                          <div className="my-1 overflow-x-auto rounded-lg border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-zinc-50/80 border-b border-zinc-100 dark:bg-zinc-900/40 dark:border-zinc-800">
                                  <th className="w-8 px-2 py-2"></th>
                                  <th className="px-3 py-2 font-semibold text-zinc-500">Fornecedor</th>
                                  <th className="px-3 py-2 font-semibold text-zinc-500">Link</th>
                                  <th className="px-3 py-2 font-semibold text-zinc-500">Quantidade</th>
                                  <th className="px-3 py-2 font-semibold text-zinc-500">Preço do Anúncio</th>
                                  <th className="px-3 py-2 font-semibold text-zinc-500 text-right">Custo Unitário</th>
                                  <th className="w-8 px-2 py-2"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                                {linksData.data.map((l) => {
                                  const unit = l.preco / l.quantidade;
                                  const isSelected = p.linkSelecionadoId === l.id;
                                  return (
                                    <tr
                                      key={l.id}
                                      className={`hover:bg-zinc-50/40 dark:hover:bg-zinc-900/20 ${
                                        isSelected ? "bg-sky-500/5 dark:bg-sky-500/10" : ""
                                      }`}
                                    >
                                      <td className="px-2 py-2 text-center">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            selectLink(p, isSelected ? null : l.id);
                                          }}
                                          className={`rounded-full transition-colors ${
                                            isSelected
                                              ? "text-sky-600 dark:text-sky-400"
                                              : "text-zinc-300 hover:text-zinc-400 dark:text-zinc-700 dark:hover:text-zinc-500"
                                          }`}
                                          title={isSelected ? "Desmarcar como valor de compra" : "Usar como valor de compra do produto"}
                                        >
                                          <StarIcon className="h-4.5 w-4.5" solid={isSelected} />
                                        </button>
                                      </td>
                                      <td className="px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                                        {l.fornecedor || "—"}
                                      </td>
                                      <td className="px-3 py-2 max-w-[220px]">
                                        <a
                                          href={l.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center gap-1.5 text-sky-600 hover:underline dark:text-sky-400"
                                          title={l.url}
                                        >
                                          {getMarketplaceName(l.url)}
                                          <ExternalLinkIcon className="h-3 w-3 shrink-0" />
                                        </a>
                                      </td>
                                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                        {l.quantidade} {l.quantidade === 1 ? "unidade" : "unidades"}
                                      </td>
                                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                        {formatBRL(l.preco)}
                                      </td>
                                      <td className="px-3 py-2 font-semibold text-zinc-900 dark:text-zinc-50 text-right whitespace-nowrap">
                                        {formatBRL(unit)}
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteLink(l.id);
                                          }}
                                          className="rounded-full p-1 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-700 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                          title="Remover link"
                                        >
                                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
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
        {filteredProdutos.map((p) => {
          const isExpanded = !!expandedProdutoIds[p.id];
          const linksData = expandedLinks[p.id];
          return (
            <li
              key={p.id}
              onClick={() => toggleRow(p.id)}
              className="flex flex-col cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex gap-3">
                <ProdutoAvatar produto={p} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-tight text-zinc-900 dark:text-zinc-50">
                    {p.nome}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    Compra {formatBRL(p.valorCompra)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <SegmentBadges produto={p} />
                  </div>
                  <div className="mt-1.5">
                    <LinksBadge produto={p} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1 self-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(p);
                    }}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    aria-label="Editar produto"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProduto(p.id);
                    }}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    aria-label="Deletar produto"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Mobile Expanded Links */}
              {isExpanded && (
                <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800" onClick={(e) => e.stopPropagation()}>
                  {linksData?.loading ? (
                    <div className="flex items-center gap-2 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Carregando links…
                    </div>
                  ) : !linksData?.data || linksData.data.length === 0 ? (
                    <p className="py-2 text-xs text-zinc-400 dark:text-zinc-500">
                      Nenhum link cadastrado para este produto.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {linksData.data.map((l) => {
                        const unit = l.preco / l.quantidade;
                        const isSelected = p.linkSelecionadoId === l.id;
                        return (
                          <li
                            key={l.id}
                            className={`rounded-lg p-2.5 text-xs transition-colors ${
                              isSelected
                                ? "bg-sky-500/5 border border-sky-200/40 dark:bg-sky-500/10 dark:border-sky-800/40"
                                : "bg-zinc-50 border border-transparent dark:bg-zinc-900/60"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectLink(p, isSelected ? null : l.id);
                                  }}
                                  className={`rounded-full transition-colors ${
                                    isSelected
                                      ? "text-sky-600 dark:text-sky-400"
                                      : "text-zinc-300 hover:text-zinc-400 dark:text-zinc-700"
                                  }`}
                                  title={isSelected ? "Desmarcar como valor de compra" : "Usar como valor de compra do produto"}
                                >
                                  <StarIcon className="h-5 w-5" solid={isSelected} />
                                </button>
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                  {l.fornecedor || "Fornecedor"}
                                </span>
                              </div>
                              <a
                                href={l.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sky-600 hover:underline dark:text-sky-400"
                              >
                                {getMarketplaceName(l.url)} ↗
                              </a>
                            </div>
                            <div className="mt-1 pl-7 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                              <span>Qtd: {l.quantidade}</span>
                              <span>Preço: {formatBRL(l.preco)}</span>
                            </div>
                            <div className="mt-2 pl-7 flex justify-between border-t border-zinc-200/60 pt-1.5 dark:border-zinc-800/80">
                              <span className="text-zinc-500">Custo unitário:</span>
                              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                {formatBRL(unit)}/un
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
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
          className="max-h-[min(92dvh,720px)] w-full overflow-hidden rounded-t-2xl border border-zinc-200 bg-background shadow-2xl dark:border-zinc-800 sm:max-w-lg sm:rounded-2xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex max-h-[inherit] flex-col">
            {/* header */}
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

            {/* form */}
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
              <div
                id={descId}
                className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
              >
                {formError && (
                  <p
                    className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
                    role="alert"
                  >
                    {formError}
                  </p>
                )}

                {/* foto do produto */}
                <div>
                  <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Foto do produto <span className="font-normal text-zinc-500">(opcional)</span>
                  </span>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800">
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
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Escolher foto
                      </button>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        ou <kbd className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[10px] dark:bg-zinc-800">Ctrl+V</kbd> para colar
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

                {/* nome */}
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

                {/* segmentos */}
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

                {/* ── LINKS DE COMPRA ────────────────────────────── */}
                {modalMode === "edit" && (
                  <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        <LinkIcon className="h-4 w-4 text-zinc-500" />
                        Links de compra
                      </span>
                      <button
                        type="button"
                        onClick={() => setLinkFormOpen((v) => !v)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40"
                      >
                        <PlusIcon className="h-3 w-3" />
                        Adicionar
                      </button>
                    </div>

                    {/* add link inline form */}
                    {linkFormOpen && (
                      <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/60 dark:bg-sky-950/20">
                        <input
                          type="url"
                          value={linkForm.url}
                          onChange={(e) =>
                            setLinkForm((f) => ({
                              ...f,
                              url: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                          placeholder="https://…"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={linkForm.fornecedor}
                            onChange={(e) =>
                              setLinkForm((f) => ({
                                ...f,
                                fornecedor: e.target.value,
                              }))
                            }
                            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                            placeholder="Fornecedor (opcional)"
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={linkForm.preco}
                            onChange={(e) =>
                              setLinkForm((f) => ({
                                ...f,
                                preco: e.target.value,
                              }))
                            }
                            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                            placeholder="Preço total do anúncio"
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={linkForm.quantidade}
                            onChange={(e) =>
                              setLinkForm((f) => ({
                                ...f,
                                quantidade: e.target.value,
                              }))
                            }
                            className="w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                            placeholder="Qtd (1)"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLinkFormOpen(false);
                              setLinkForm(emptyLinkForm());
                            }}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={addLink}
                            disabled={!linkForm.url.trim() || addingLink}
                            className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
                          >
                            {addingLink ? "Salvando…" : "Salvar link"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* links list */}
                    {linksLoading ? (
                      <p className="py-2 text-center text-xs text-zinc-400">
                        Carregando links…
                      </p>
                    ) : links.length === 0 ? (
                      <p className="py-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
                        Nenhum link cadastrado
                      </p>
                    ) : (
                      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {links.map((link) => {
                          const isSelected = form.linkSelecionadoId === link.id;
                          return (
                            <li
                              key={link.id}
                              className={`flex items-center gap-3 py-2 px-2 rounded-lg transition-colors ${
                                isSelected
                                  ? "bg-sky-500/5 dark:bg-sky-500/10"
                                  : "hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  const productObj = produtos.find(p => p.id === editingProdutoId);
                                  if (productObj) {
                                    selectLink(productObj, isSelected ? null : link.id);
                                  }
                                }}
                                className={`shrink-0 rounded-full transition-colors ${
                                  isSelected
                                    ? "text-sky-600 dark:text-sky-400"
                                    : "text-zinc-300 hover:text-zinc-400 dark:text-zinc-700 dark:hover:text-zinc-500"
                                }`}
                                title={isSelected ? "Desmarcar como valor de compra" : "Usar como valor de compra do produto"}
                              >
                                <StarIcon className="h-5 w-5" solid={isSelected} />
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="truncate text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                                  >
                                    {getMarketplaceName(link.url)}
                                  </a>
                                  <ExternalLinkIcon className="h-3 w-3 shrink-0 text-zinc-400" />
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {link.fornecedor && (
                                    <span className="font-medium">{link.fornecedor}</span>
                                  )}
                                  <span>·</span>
                                  <span>{formatBRL(link.preco)}</span>
                                  <span className="text-zinc-400 dark:text-zinc-500">
                                    (Qtd: {link.quantidade})
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteLink(link.id)}
                                className="shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                aria-label="Remover link"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* footer */}
              <div className="flex shrink-0 items-center gap-3 border-t border-zinc-200 p-4 dark:border-zinc-800">
                {modalMode === "edit" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingProdutoId) deleteProduto(editingProdutoId);
                      closeModal();
                    }}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    Deletar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="ml-auto flex h-11 items-center justify-center rounded-xl bg-sky-600 px-6 text-sm font-semibold text-white hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50"
                >
                  {submitting ? "Salvando…" : "Salvar produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ── MAIN RENDER ────────────────────────────────────────────────── */
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 pb-28">
      {/* header row */}
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Itens de consumo ou peças que entram nos serviços. Depois você marca
          quais deles cada serviço utiliza.
        </p>
        <button
          type="button"
          onClick={() => openModal()}
          className="hidden shrink-0 items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 active:bg-sky-800 md:inline-flex"
        >
          <PlusIcon className="h-4 w-4" />
          Adicionar produto
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

      {/* mobile fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden dark:border-zinc-800">
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

      {/* modal */}
      {modalOpen && renderModal()}
    </div>
  );
}
