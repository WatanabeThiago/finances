export type Partner = {
  id: string;
  fotoDataUrl?: string;
  nome: string;
  endereco: string;
  latitude?: number;
  longitude?: number;
  automotivo: boolean;
  residencial: boolean;
};

export const PARTNERS_STORAGE_KEY = "finances.parceiros.v1";

const listeners = new Set<() => void>();

export function parsePartnersJson(raw: string): Partner[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is Partner =>
        typeof p === "object" &&
        p !== null &&
        typeof (p as Partner).id === "string" &&
        typeof (p as Partner).nome === "string" &&
        typeof (p as Partner).endereco === "string" &&
        typeof (p as Partner).automotivo === "boolean" &&
        typeof (p as Partner).residencial === "boolean"
    );
  } catch {
    return [];
  }
}

export function partnersStorageSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  return localStorage.getItem(PARTNERS_STORAGE_KEY) ?? "[]";
}

export function subscribePartners(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === PARTNERS_STORAGE_KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  listeners.add(onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    listeners.delete(onChange);
  };
}

export function notifyPartnersChanged(): void {
  listeners.forEach((cb) => cb());
}

export function appendPartner(partner: Partner): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(PARTNERS_STORAGE_KEY) ?? "[]";
  const current = parsePartnersJson(raw);
  const next = [partner, ...current];
  try {
    localStorage.setItem(PARTNERS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota / private mode
  }
  notifyPartnersChanged();
}

export function updatePartner(partner: Partner): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(PARTNERS_STORAGE_KEY) ?? "[]";
  const current = parsePartnersJson(raw);
  const next = current.map((p) => (p.id === partner.id ? partner : p));
  try {
    localStorage.setItem(PARTNERS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota / private mode
  }
  notifyPartnersChanged();
}
