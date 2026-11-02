"use client";

import { useEffect, useState } from "react";
import type { TrackingEvent } from "@/lib/tracking";
import {
  AbTestComparisonScreen,
  AbTestComparisonSkeleton,
} from "@/components/tracking/ab-test-comparison-screen";

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
      <div className="pt-2">
        <AbTestComparisonSkeleton />
      </div>
    );
  }

  return (
    <div className="pt-2">
      <AbTestComparisonScreen
        events={events}
        loading={loading}
        onRefresh={fetchEvents}
        onEventsChange={setEvents}
      />
    </div>
  );
}
