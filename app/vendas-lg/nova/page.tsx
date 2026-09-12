import type { Metadata } from "next";
import { Suspense } from "react";
import { NovaVendaScreen } from "@/components/vendas-lg";

export const metadata: Metadata = {
  title: "Nova venda",
};

export default function NovaVendaPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-zinc-500">Carregando...</div>}>
      <NovaVendaScreen />
    </Suspense>
  );
}

