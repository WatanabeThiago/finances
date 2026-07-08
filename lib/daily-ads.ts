export type DailyAdsRecord = {
  id: string;
  date: string;
  spend: number;
  cpc: number;
  impressions: number;
  createdAt: string;
};

export type DailyAdsInput = Pick<
  DailyAdsRecord,
  "date" | "spend" | "cpc" | "impressions"
>;

export function isValidBrazilianDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
