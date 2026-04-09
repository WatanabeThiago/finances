export type Service = {
  id: string;
  fotoDataUrl?: string;
  nome: string;
  valor: number;
  valorNoturno: number;
  gastosEstimados: number;
  observacoes: string;
  prestadorIds: string[];
  /** IDs do catálogo em Produtos (miolos, chips, chaves…). */
  produtoIds: string[];
  automotivo: boolean;
  residencial: boolean;
};

export const SERVICES_STORAGE_KEY = "finances.servicos.v1";

const listeners = new Set<() => void>();

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export function parseServicesJson(raw: string): Service[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
      .map((raw) => {
        const s = raw as Record<string, unknown>;
        if (
          typeof s.id !== "string" ||
          typeof s.nome !== "string" ||
          typeof s.valor !== "number" ||
          !Number.isFinite(s.valor) ||
          typeof s.valorNoturno !== "number" ||
          !Number.isFinite(s.valorNoturno) ||
          typeof s.gastosEstimados !== "number" ||
          !Number.isFinite(s.gastosEstimados) ||
          typeof s.observacoes !== "string" ||
          typeof s.automotivo !== "boolean" ||
          typeof s.residencial !== "boolean"
        ) {
          return null;
        }
        const prestadorIds = isStringArray(s.prestadorIds) ? s.prestadorIds : [];
        const produtoIds = isStringArray(s.produtoIds) ? s.produtoIds : [];
        const out: Service = {
          id: s.id,
          nome: s.nome,
          valor: s.valor,
          valorNoturno: s.valorNoturno,
          gastosEstimados: s.gastosEstimados,
          observacoes: s.observacoes,
          prestadorIds,
          produtoIds,
          automotivo: s.automotivo,
          residencial: s.residencial,
        };
        if (typeof s.fotoDataUrl === "string" && s.fotoDataUrl.length > 0) {
          out.fotoDataUrl = s.fotoDataUrl;
        }
        return out;
      })
      .filter((s): s is Service => s !== null);
  } catch {
    return [];
  }
}

export function servicesStorageSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  return localStorage.getItem(SERVICES_STORAGE_KEY) ?? "[]";
}

export function subscribeServices(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === SERVICES_STORAGE_KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  listeners.add(onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    listeners.delete(onChange);
  };
}

export function notifyServicesChanged(): void {
  listeners.forEach((cb) => cb());
}

export function appendService(service: Service): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(SERVICES_STORAGE_KEY) ?? "[]";
  const current = parseServicesJson(raw);
  const next = [service, ...current];
  try {
    localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota
  }
  notifyServicesChanged();
}

export function updateService(service: Service): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(SERVICES_STORAGE_KEY) ?? "[]";
  const current = parseServicesJson(raw);
  const next = current.map((s) => (s.id === service.id ? service : s));
  try {
    localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota
  }
  notifyServicesChanged();
}
