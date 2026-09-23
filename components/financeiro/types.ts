export type PeriodoFinanceiro = {
  mes: number;
  ano: number;
  daysInMonth: number;
  diasDecorridos: number;
  isCurrentMonth: boolean;
};

export type ParametrosFinanceiro = {
  aliquotaImposto: number;
  diasSegurancaGiro: number;
};

export type ResumoVendas = {
  totalVendasCount: number;
  faturamentoBrutoTotal: number;
  repasseParceiros: number;
  ticketMedioTransacionado: number;
  comissaoBrutaTotal: number;
  comissaoRecebidaMes: number;
  comissaoPendenteMes: number;
  comissaoMediaPorVenda: number;
};

export type Tributos = {
  aliquotaImposto: number;
  provisaoSimplesNacional: number;
  comissaoLiquidaImposto: number;
  diaVencimentoDAS: number;
};

export type GoogleAdsMetrics = {
  totalGastoAds: number;
  mediaDiariaAds: number;
  totalCliquesAds: number;
  totalImpressoesAds: number;
  roasReal: number;
  cacMedio: number;
  diasComRegistro: number;
};

export type MargemContribuicao = {
  valor: number;
  percentual: number;
  status: "positiva" | "negativa";
};

export type CustosOperacionais = {
  totalContasFixasMes: number;
  totalSaidasVariaveisPagas: number;
  totalSaidasPagas: number;
  totalContasAPagarPendente: number;
  totalDespesasOperacionais: number;
  contasFixas: Array<{
    id: string;
    nome: string;
    valor: number;
    categoria: string;
    diaVencimento: number;
    ativo: boolean;
  }>;
};

export type ResultadoReal = {
  lucroLiquidoReal: number;
  margemLiquidaRealPercentual: number;
  status: "lucro" | "prejuizo" | "zero";
};

export type PontoEquilibrio = {
  comissaoNecessaria: number;
  vendasNecessarias: number;
  vendasRealizadas: number;
  comissaoRealizada: number;
  faltaParaAtingir: number;
  progressoPercentual: number;
  atingido: boolean;
};

export type CapitalDeGiro = {
  diasSeguranca: number;
  custoDiarioSobrevivencia: number;
  reservaAds: number;
  reservaCustosFixos: number;
  reservaImpostos: number;
  dinheiroNaRua: number;
  capitalDeGiroRecomendado: number;
};

export type ItemDinheiroNaRua = {
  id: string;
  clienteNome: string;
  clienteTelefone?: string;
  dataVenda: string;
  prestadorNome: string;
  comissao: number;
  valorTotalVenda: number;
  formaPagamento?: string;
};

export type DinheiroNaRua = {
  total: number;
  quantidadePendencias: number;
  itens: ItemDinheiroNaRua[];
};

export type FinanceiroData = {
  periodo: PeriodoFinanceiro;
  parametros: ParametrosFinanceiro;
  resumoVendas: ResumoVendas;
  tributos: Tributos;
  googleAds: GoogleAdsMetrics;
  margemContribuicao: MargemContribuicao;
  custosOperacionais: CustosOperacionais;
  resultadoReal: ResultadoReal;
  pontoEquilibrio: PontoEquilibrio;
  capitalDeGiro: CapitalDeGiro;
  dinheiroNaRua: DinheiroNaRua;
};
