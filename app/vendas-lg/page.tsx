import type { Metadata } from "next";
import { VendasLgScreen } from "@/components/vendas-lg/vendas-lg-screen";

export const metadata: Metadata = {
  title: "Lead generation",
};

export default function LeadGenerationPage() {
  return <VendasLgScreen />;
}
