export type DailyAds = {
  id: string;
  data: string; // YYYY-MM-DD format
  entradaReal: number;
  gastosGoogleAds: number;
  clientes: number;
  cac: number; // Custo de Aquisição
  ticketMedio: number;
  cpc: number; // Custo Por Clique
  resultado: number; // Lucro/Prejuízo
  createdAt: string;
  updatedAt: string;
};
