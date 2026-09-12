import type { Metadata } from "next";
import { Suspense } from "react";
import { VendasLgScreen } from "@/components/vendas-lg";

import { SkeletonList, Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Vendas",
};

export default function LeadGenerationPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <SkeletonList count={6} />
        </div>
      }
    >
      <VendasLgScreen />
    </Suspense>
  );
}
