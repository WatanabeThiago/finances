import type { Metadata } from "next";
import { Suspense } from "react";
import { VendasLgScreen } from "@/components/vendas-lg";

export const metadata: Metadata = {
  title: "Lead generation",
};

export default function LeadGenerationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-zinc-500">Carregando vendas...</p></div>}>
      <VendasLgScreen />
    </Suspense>
  );
}
