import type { Metadata } from "next";
import { ClientesScreen } from "@/components/clientes/clientes-screen";

export const metadata: Metadata = {
  title: "Clientes",
};

export default function ClientesPage() {
  return <ClientesScreen />;
}
