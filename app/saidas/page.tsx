import type { Metadata } from "next";
import { SaidasScreen } from "@/components/saidas/saidas-screen";

export const metadata: Metadata = {
  title: "Saídas & Despesas",
  description: "Controle de despesas e custos operacionais do Chaveiro 24h",
};

export default function SaidasPage() {
  return <SaidasScreen />;
}
