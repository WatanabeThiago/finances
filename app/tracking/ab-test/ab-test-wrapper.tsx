"use client";

import { useEffect, useState } from "react";
import type { TrackingEvent } from "@/lib/tracking";
import { AbTestComparisonScreen } from "@/components/tracking/ab-test-comparison-screen";
import { Skeleton, SkeletonList } from "@/components/ui/skeleton";

export function AbTestPageWrapper() {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tracking");
      if (!res.ok) throw new Error("Falha ao buscar tracking");
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error("Erro ao carregar dados A/B:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  if (loading && events.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-28 pt-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <SkeletonList count={5} />
      </div>
    );
  }

  return (
    <div className="pt-2">
      <AbTestComparisonScreen
        events={events}
        loading={loading}
        onRefresh={fetchEvents}
      />
    </div>
  );
}
