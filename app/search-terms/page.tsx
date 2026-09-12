import type { Metadata } from "next";
import SearchTermsScreen from "@/components/search-terms/search-terms-screen";

export const metadata: Metadata = {
  title: "Termos de Busca",
};

export default function SearchTermsPage() {
  return <SearchTermsScreen />;
}

