import type { Metadata } from "next";
import { NovaVendaScreen } from "@/components/vendas-lg";

export const metadata: Metadata = {
  title: "Nova venda",
};

export default function NovaVendaPage() {
  return <NovaVendaScreen />;
}
