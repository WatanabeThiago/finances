import type { Metadata } from "next";
import { AbTestPageWrapper } from "./ab-test-wrapper";

export const metadata: Metadata = {
  title: "Teste A/B - Hero",
  description: "Comparativo de conversão e métricas A/B da landing page",
};

export default function AbTestPage() {
  return <AbTestPageWrapper />;
}
