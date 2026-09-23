import type { Metadata } from "next";
import { Suspense } from "react";
import { FinanceiroScreen } from "@/components/financeiro";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Financeiro",
  description: "Gestão de capital de giro, DRE operacional e ponto de equilíbrio",
};

export default function FinanceiroPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-12">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      }
    >
      <FinanceiroScreen />
    </Suspense>
  );
}
