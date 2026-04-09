/** Item do catálogo em Produtos (miolos, chips, chaves, etc.). */
export type Produto = {
  id: string;
  nome: string;
  valorCompra: number;
  residencial: boolean;
  automotivo: boolean;
  fotoDataUrl?: string;
};

export const PRODUTOS_STORAGE_KEY = "finances.produtos.v1";

const listeners = new Set<() => void>();

export function parseProdutosJson(raw: string): Produto[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => typeof p === "object" && p !== null)
      .map((item) => {
        const p = item as Record<string, unknown>;
        if (typeof p.id !== "string" || typeof p.nome !== "string") return null;
        const valorCompra =
          typeof p.valorCompra === "number" && Number.isFinite(p.valorCompra)
            ? p.valorCompra
            : 0;
        const residencial =
          typeof p.residencial === "boolean" ? p.residencial : false;
        const automotivo =
          typeof p.automotivo === "boolean" ? p.automotivo : false;
        const out: Produto = {
          id: p.id,
          nome: p.nome,
          valorCompra,
          residencial,
          automotivo,
        };
        if (typeof p.fotoDataUrl === "string" && p.fotoDataUrl.length > 0) {
          out.fotoDataUrl = p.fotoDataUrl;
        }
        return out;
      })
      .filter((x): x is Produto => x !== null);
  } catch {
    return [];
  }
}

export function produtosStorageSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  return localStorage.getItem(PRODUTOS_STORAGE_KEY) ?? "[]";
}

export function subscribeProdutos(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === PRODUTOS_STORAGE_KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  listeners.add(onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    listeners.delete(onChange);
  };
}

export function notifyProdutosChanged(): void {
  listeners.forEach((cb) => cb());
}

export function appendProduto(produto: Produto): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(PRODUTOS_STORAGE_KEY) ?? "[]";
  const current = parseProdutosJson(raw);
  const next = [produto, ...current];
  try {
    localStorage.setItem(PRODUTOS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota
  }
  notifyProdutosChanged();
}

export function updateProduto(produto: Produto): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(PRODUTOS_STORAGE_KEY) ?? "[]";
  const current = parseProdutosJson(raw);
  const next = current.map((p) => (p.id === produto.id ? produto : p));
  try {
    localStorage.setItem(PRODUTOS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota
  }
  notifyProdutosChanged();
}
