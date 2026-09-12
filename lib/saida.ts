export type SaidaCategoria =
  | "Ferramentas"
  | "Materiais"
  | "Produtos"
  | "Chips"
  | "Alimentação"
  | "Máquina"
  | "Combustível"
  | "Outros";

export type FormaPagamentoSaida =
  | "Pix"
  | "Dinheiro"
  | "Cartão de Crédito"
  | "Cartão de Débito"
  | "Transferência";

export interface Saida {
  id: string;
  valor: number;
  categoria: string;
  descricao: string;
  formaPagamento: string;
  dataSaida: string;
  createdAt?: string;
  updatedAt?: string;
}

export const CATEGORIAS_PADRAO: Array<{
  id: SaidaCategoria;
  label: string;
  icone: string;
  cor: string;
  bg: string;
  border: string;
  text: string;
}> = [
  {
    id: "Ferramentas",
    label: "Ferramentas",
    icone: "🔧",
    cor: "amber",
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    border: "border-amber-500/30",
    text: "text-amber-700 dark:text-amber-300",
  },
  {
    id: "Materiais",
    label: "Materiais",
    icone: "🔩",
    cor: "zinc",
    bg: "bg-zinc-500/10 dark:bg-zinc-500/20",
    border: "border-zinc-500/30",
    text: "text-zinc-700 dark:text-zinc-300",
  },
  {
    id: "Produtos",
    label: "Produtos",
    icone: "📦",
    cor: "blue",
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    border: "border-blue-500/30",
    text: "text-blue-700 dark:text-blue-300",
  },
  {
    id: "Chips",
    label: "Chips",
    icone: "💻",
    cor: "indigo",
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    border: "border-indigo-500/30",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  {
    id: "Máquina",
    label: "Máquina",
    icone: "⚙️",
    cor: "purple",
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    border: "border-purple-500/30",
    text: "text-purple-700 dark:text-purple-300",
  },
  {
    id: "Alimentação",
    label: "Alimentação",
    icone: "🍔",
    cor: "orange",
    bg: "bg-orange-500/10 dark:bg-orange-500/20",
    border: "border-orange-500/30",
    text: "text-orange-700 dark:text-orange-300",
  },
  {
    id: "Combustível",
    label: "Combustível",
    icone: "⛽",
    cor: "emerald",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    border: "border-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  {
    id: "Outros",
    label: "Outros",
    icone: "⚡",
    cor: "slate",
    bg: "bg-slate-500/10 dark:bg-slate-500/20",
    border: "border-slate-500/30",
    text: "text-slate-700 dark:text-slate-300",
  },
];

export const FORMAS_PAGAMENTO: FormaPagamentoSaida[] = [
  "Pix",
  "Dinheiro",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Transferência",
];

export function getCategoriaInfo(categoriaNome: string) {
  const found = CATEGORIAS_PADRAO.find(
    (c) => c.id.toLowerCase() === categoriaNome.toLowerCase() || c.label.toLowerCase() === categoriaNome.toLowerCase()
  );
  if (found) return found;

  return {
    id: categoriaNome as SaidaCategoria,
    label: categoriaNome,
    icone: "💸",
    cor: "zinc",
    bg: "bg-zinc-500/10 dark:bg-zinc-500/20",
    border: "border-zinc-500/30",
    text: "text-zinc-700 dark:text-zinc-300",
  };
}
