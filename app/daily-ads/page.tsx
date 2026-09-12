import type { Metadata } from "next";
import { DailyAdsScreen } from "@/components/daily-ads/daily-ads-screen";

export const metadata: Metadata = {
  title: "Google Ads",
};

export default function DailyAdsPage() {
  return <DailyAdsScreen />;
}

