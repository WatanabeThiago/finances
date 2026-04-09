/** Aceita formatos como 150, 150,50 ou 1.234,56 (pt-BR). */
export function parseMoney(input: string): number | undefined {
  const t = input.trim();
  if (!t) return undefined;
  const normalized = t.replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : undefined;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** Valor numérico para preencher inputs de moeda (ex.: 150,5 → "150,50"). */
export function formatNumberBrInput(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
