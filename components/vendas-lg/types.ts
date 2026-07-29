export type VendaLgDateRange =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "upcoming"
  | "all";

export type VendaLgCommissionFilter = "all" | "pago" | "nao-pago";

export type VendaLgStats = {
  comissaoMedia: number;
  totalVendas: number;
  comissaoPaga: number;
  comissaoNaoPaga: number;
  comissaoTotal: number;
  faturamentoParceiro: number;
  faturamentoTotal: number;
};

export type VendaLgChartDatum = {
  label: string;
  faturamento: number;
  comissao: number;
  ts: number;
};
