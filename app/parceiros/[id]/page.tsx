import type { Metadata } from "next";
import { ParceiroDashboardScreen } from "@/components/parceiros/parceiro-dashboard-screen";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Dashboard do Parceiro",
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <ParceiroDashboardScreen id={id} />;
}
