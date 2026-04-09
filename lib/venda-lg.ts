export type VendaLgLine = {
  id: string;
  servicoId: string;
  precoOriginal: number;
  preco: number;
  quantidade: number;
};

export type VendaLg = {
  id: string;
  createdAt: string;
  clienteNome: string;
  clienteTelefone: string;
  clienteDoc?: string;
  prestadorId?: string;
  comissao?: number;
  comissaoPaga?: boolean;
  linhas: VendaLgLine[];
};

export const VENDAS_LG_STORAGE_KEY = "finances.vendas-lg.v1";

const listeners = new Set<() => void>();

function isLineArray(v: unknown): v is VendaLgLine[] {
  if (!Array.isArray(v)) return false;
  return v.every(
    (x) =>
      typeof x === "object" &&
      x !== null &&
      typeof (x as VendaLgLine).id === "string" &&
      typeof (x as VendaLgLine).servicoId === "string" &&
      typeof (x as VendaLgLine).precoOriginal === "number" &&
      Number.isFinite((x as VendaLgLine).precoOriginal) &&
      typeof (x as VendaLgLine).preco === "number" &&
      Number.isFinite((x as VendaLgLine).preco) &&
      typeof (x as VendaLgLine).quantidade === "number" &&
      Number.isFinite((x as VendaLgLine).quantidade)
  );
}

export function parseVendasLgJson(raw: string): VendaLg[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => typeof p === "object" && p !== null)
      .map((item) => {
        const v = item as Record<string, unknown>;
        if (
          typeof v.id !== "string" ||
          typeof v.createdAt !== "string" ||
          typeof v.clienteNome !== "string" ||
          typeof v.clienteTelefone !== "string" ||
          !isLineArray(v.linhas)
        ) {
          return null;
        }
        const out: VendaLg = {
          id: v.id,
          createdAt: v.createdAt,
          clienteNome: v.clienteNome,
          clienteTelefone: v.clienteTelefone,
          linhas: v.linhas,
        };
        if (typeof v.clienteDoc === "string" && v.clienteDoc.trim().length > 0) {
          out.clienteDoc = v.clienteDoc.trim();
        }
        if (typeof v.prestadorId === "string" && v.prestadorId.trim().length > 0) {
          out.prestadorId = v.prestadorId.trim();
        }
        if (typeof v.comissao === "number" && Number.isFinite(v.comissao)) {
          out.comissao = v.comissao;
        }
        if (typeof v.comissaoPaga === "boolean") {
          out.comissaoPaga = v.comissaoPaga;
        }
        return out;
      })
      .filter((x): x is VendaLg => x !== null);
  } catch {
    return [];
  }
}

export function vendasLgStorageSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  return localStorage.getItem(VENDAS_LG_STORAGE_KEY) ?? "[]";
}

export function subscribeVendasLg(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === VENDAS_LG_STORAGE_KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  listeners.add(onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    listeners.delete(onChange);
  };
}

export function notifyVendasLgChanged(): void {
  listeners.forEach((cb) => cb());
}

export function appendVendaLg(venda: VendaLg): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(VENDAS_LG_STORAGE_KEY) ?? "[]";
  const current = parseVendasLgJson(raw);
  const next = [venda, ...current];
  try {
    localStorage.setItem(VENDAS_LG_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota
  }
  notifyVendasLgChanged();
}

export function updateVendaLg(venda: VendaLg): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(VENDAS_LG_STORAGE_KEY) ?? "[]";
  const current = parseVendasLgJson(raw);
  const next = current.map((v) => (v.id === venda.id ? venda : v));
  try {
    localStorage.setItem(VENDAS_LG_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota
  }
  notifyVendasLgChanged();
}

export function totalVendaLg(v: VendaLg): number {
  return v.linhas.reduce((acc, l) => acc + l.preco * l.quantidade, 0);
}
