import type { Metadata } from "next";
import { ParceirosScreen } from "@/components/parceiros/parceiros-screen";

export const metadata: Metadata = {
  title: "Parceiros",
};

export default function ParceirosPage() {
  return <ParceirosScreen />;
}
