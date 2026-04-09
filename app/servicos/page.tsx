import type { Metadata } from "next";
import { ServicosScreen } from "@/components/servicos/servicos-screen";

export const metadata: Metadata = {
  title: "Serviços",
};

export default function ServicosPage() {
  return <ServicosScreen />;
}
