export type SaidaCategoria =
  | "Crédito/Empréstimo"
  | "Imóvel"
  | "Veículo/Oficina"
  | "Combustível"
  | "Ferramentas"
  | "Materiais"
  | "Produtos"
  | "Chips"
  | "Máquina"
  | "Contador/Tributos"
  | "Internet/Telefonia"
  | "Marketing/Anúncios"
  | "Alimentação"
  | "Outros";

export type FormaPagamentoSaida =
  | "Pix"
  | "Dinheiro"
  | "Cartão de Crédito"
  | "Cartão de Débito"
  | "Transferência";

export type SaidaStatus = "pago" | "pendente";

export interface Saida {
  id: string;
  valor: number;
  categoria: string;
  descricao: string;
  formaPagamento: string;
  status: SaidaStatus;
  dataVencimento?: string | null;
  dataPagamento?: string | null;
  fornecedor?: string;
  isFixa?: boolean;
  taxaMes?: number | null;
  creditoId?: string | null;
  numeroParcela?: number | null;
  dataSaida: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContaFixa {
  id: string;
  nome: string;
  valor: number;
  categoria: string;
  diaVencimento: number;
  ativo: boolean;
  observacoes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  tipo: "comum" | "credito";
  categoria?: string | null;
  taxaMes?: number | null;
  obs?: string;
  tipoVencimento?: "dia-fixo" | "d+n";
  diaVencimento?: number | null;
  diasApos?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Credito {
  id: string;
  fornecedorNome: string;
  valorOriginal: number;
  taxaMes?: number | null;
  numParcelas: number;
  valorParcela: number;
  tipoVencimento: "dia-fixo" | "d+n";
  diaVencimento?: number | null;
  diasApos?: number | null;
  dataContratacao: string;
  categoria: string;
  descricao?: string;
  status: "ativo" | "quitado" | "cancelado";
  parcelasPagas: number;
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
    id: "Crédito/Empréstimo",
    label: "Crédito/Empréstimo",
    icone: "💳",
    cor: "red",
    bg: "bg-red-500/10 dark:bg-red-500/20",
    border: "border-red-500/30",
    text: "text-red-700 dark:text-red-300",
  },
  {
    id: "Imóvel",
    label: "Imóvel",
    icone: "🏠",
    cor: "rose",
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    border: "border-rose-500/30",
    text: "text-rose-700 dark:text-rose-300",
  },
  {
    id: "Veículo/Oficina",
    label: "Veículo/Oficina",
    icone: "🚗",
    cor: "blue",
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    border: "border-blue-500/30",
    text: "text-blue-700 dark:text-blue-300",
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
    cor: "sky",
    bg: "bg-sky-500/10 dark:bg-sky-500/20",
    border: "border-sky-500/30",
    text: "text-sky-700 dark:text-sky-300",
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
    id: "Contador/Tributos",
    label: "Contador/Tributos",
    icone: "📑",
    cor: "teal",
    bg: "bg-teal-500/10 dark:bg-teal-500/20",
    border: "border-teal-500/30",
    text: "text-teal-700 dark:text-teal-300",
  },
  {
    id: "Internet/Telefonia",
    label: "Internet/Telefonia",
    icone: "🌐",
    cor: "cyan",
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    border: "border-cyan-500/30",
    text: "text-cyan-700 dark:text-cyan-300",
  },
  {
    id: "Marketing/Anúncios",
    label: "Marketing/Anúncios",
    icone: "📢",
    cor: "pink",
    bg: "bg-pink-500/10 dark:bg-pink-500/20",
    border: "border-pink-500/30",
    text: "text-pink-700 dark:text-pink-300",
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

/**
 * Formata com segurança uma string ou data ISO para formato brasileiro dd/mm/aaaa,
 * evitando problemas de fuso horário UTC (onde 2026-10-15T00:00:00Z vira 14/10/2026 no Brasil UTC-3).
 */
export function formatVencimentoBR(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  if (typeof dateStr === "string") {
    // Se vier no formato "YYYY-MM-DD" ou comecar com "YYYY-MM-DD"
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`;
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/**
 * Normaliza um valor de data digitado em input type="date" (YYYY-MM-DD)
 * para salvar com hora do meio-dia (12:00:00) UTC, prevenindo que shifts de timezone
 * joguem a data para o dia anterior.
 */
export function parseDateInputToISO(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 12, 0, 0)).toISOString();
  }
  return new Date(dateString).toISOString();
}

/**
 * Formata uma data para o input HTML type="date" (YYYY-MM-DD)
 * sem sofrer deslocamento de fuso horário.
 */
export function formatDateForInput(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  if (typeof dateStr === "string") {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Sincroniza as contas fixas ativas com a tabela de Saídas do mês corrente.
 * Se uma conta fixa ativa ainda não tiver sido lançada neste mês (nem pendente nem paga),
 * ela é automaticamente criada como 'pendente', ficando disponível em 'Contas a Pagar'.
 */
export async function syncContasFixasDoMes(queryFn: (text: string, params?: unknown[]) => Promise<any[]>): Promise<void> {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // 1. Buscar todas as contas fixas ativas
    const fixas = await queryFn(
      `SELECT id, nome, valor, categoria, "diaVencimento", ativo
       FROM public."ContaFixa"
       WHERE ativo = true`
    );

    if (!fixas || fixas.length === 0) {
      return;
    }

    // Início e fim do mês corrente em UTC
    const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));

    // 2. Buscar saídas fixas já existentes para este mês
    const existingSaidasFixas = await queryFn(
      `SELECT id, descricao, valor, categoria, status, "isFixa", "dataVencimento", "dataSaida"
       FROM public."Saida"
       WHERE "isFixa" = true
         AND (
           ("dataSaida" >= $1 AND "dataSaida" <= $2)
           OR ("dataVencimento" >= $1 AND "dataVencimento" <= $2)
         )`,
      [startOfMonth, endOfMonth]
    );

    for (const fixa of fixas) {
      const nomeLower = (fixa.nome || "").trim().toLowerCase();

      const jaExiste = existingSaidasFixas.some((s: any) => {
        const descLower = (s.descricao || "").trim().toLowerCase();
        return (
          descLower === `conta fixa: ${nomeLower}` ||
          descLower === nomeLower ||
          descLower.startsWith(`conta fixa: ${nomeLower}`)
        );
      });

      if (!jaExiste) {
        const maxDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const diaVenc = Math.min(Math.max(1, fixa.diaVencimento || 10), maxDaysInMonth);
        const dataVencimento = new Date(Date.UTC(currentYear, currentMonth, diaVenc, 12, 0, 0));

        await queryFn(
          `INSERT INTO public."Saida" (
             valor, categoria, descricao, "formaPagamento", status,
             "dataVencimento", "dataPagamento", fornecedor, "isFixa", "dataSaida"
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            Number(fixa.valor),
            fixa.categoria || "Outros",
            `Conta Fixa: ${fixa.nome.trim()}`,
            "Pix",
            "pendente",
            dataVencimento,
            null,
            fixa.nome.trim(),
            true,
            dataVencimento,
          ]
        );
      }
    }
  } catch (err) {
    console.error("Erro ao sincronizar contas fixas:", err);
  }
}

