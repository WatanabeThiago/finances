"use client";

import dynamic from "next/dynamic";

const HeatmapScreen = dynamic(
  () => import("@/components/locations/heatmap-screen").then(mod => ({ default: mod.HeatmapScreen })),
  { ssr: false }
);

export default function LocationsPage() {
  return <HeatmapScreen />;
}
