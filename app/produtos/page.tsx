import type { Metadata } from "next";
import { ProdutosScreen } from "@/components/produtos/produtos-screen";

export const metadata: Metadata = {
  title: "Produtos",
};

export default function ProdutosPage() {
  return <ProdutosScreen />;
}
