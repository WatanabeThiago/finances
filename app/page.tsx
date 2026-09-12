import type { Metadata } from "next";
import { DashboardScreen } from "@/components/dashboard/dashboard-screen";

export const metadata: Metadata = {
  title: "Início",
};

export default function HomePage() {
  return <DashboardScreen />;
}

