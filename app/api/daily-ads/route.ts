import { query } from "@/lib/db";
import { isValidBrazilianDate, type DailyAdsRecord } from "@/lib/daily-ads";

type DailyAdsRow = {
  id: string;
  date: string;
  spend: string | number;
  cpc: string | number;
  impressions: string | number;
  createdAt: Date | string;
};

function serializeRecord(row: DailyAdsRow): DailyAdsRecord {
  return {
    id: row.id,
    date: row.date,
    spend: Number(row.spend),
    cpc: Number(row.cpc),
    impressions: Number(row.impressions),
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
  };
}

function finiteNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasDatabaseCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export async function GET() {
  try {
    const rows = (await query(
      `SELECT id, date, spend, cpc, impressions, "createdAt"
       FROM public."DailyAdsManual"
       ORDER BY "createdAt" DESC`,
    )) as DailyAdsRow[];

    return Response.json(rows.map(serializeRecord));
  } catch (error) {
    console.error("GET /api/daily-ads", error);
    return Response.json(
      { error: "Não foi possível listar os registros." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  const date = typeof body?.date === "string" ? body.date.trim() : "";
  const spend = finiteNumber(body?.spend);
  const cpc = finiteNumber(body?.cpc);
  const impressions = finiteNumber(body?.impressions);

  if (
    !isValidBrazilianDate(date) ||
    spend === null ||
    spend < 0 ||
    cpc === null ||
    cpc < 0 ||
    impressions === null ||
    !Number.isInteger(impressions) ||
    impressions < 0
  ) {
    return Response.json(
      { error: "Data, gasto, CPC ou impressões inválidos." },
      { status: 400 },
    );
  }

  try {
    const rows = (await query(
      `INSERT INTO public."DailyAdsManual"
        (id, date, spend, cpc, impressions, "createdAt")
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, date, spend, cpc, impressions, "createdAt"`,
      [crypto.randomUUID(), date, spend, cpc, impressions],
    )) as DailyAdsRow[];

    return Response.json(serializeRecord(rows[0]), { status: 201 });
  } catch (error) {
    if (hasDatabaseCode(error, "23505")) {
      return Response.json(
        { error: "Já existe um registro para essa data." },
        { status: 409 },
      );
    }

    console.error("POST /api/daily-ads", error);
    return Response.json(
      { error: "Não foi possível salvar o registro." },
      { status: 500 },
    );
  }
}
