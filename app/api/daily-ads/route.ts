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

function isAuthorized(request: Request): boolean {
  const secretKey = process.env.DAILY_ADS_API_KEY;
  if (!secretKey) return true;

  const apiKeyHeader = request.headers.get("x-api-key");
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, "");

  if (apiKeyHeader === secretKey || bearerToken === secretKey) {
    return true;
  }

  // Permite requisições da mesma origem (dashboard web da aplicação)
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin") {
    return true;
  }

  const origin = request.headers.get("origin") || "";
  const host = request.headers.get("host") || "";
  if (host && origin.includes(host)) {
    return true;
  }
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return true;
  }

  return false;
}

type ValidatedItem = {
  date: string;
  spend: number;
  cpc: number;
  impressions: number;
};

function validateDailyItem(item: unknown): ValidatedItem | null {
  if (typeof item !== "object" || item === null) return null;
  const obj = item as Record<string, unknown>;

  const date = typeof obj.date === "string" ? obj.date.trim() : "";
  const spend = finiteNumber(obj.spend);
  const cpc = finiteNumber(obj.cpc);
  const impressions = finiteNumber(obj.impressions);

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
    return null;
  }

  return { date, spend, cpc, impressions };
}

async function upsertRecord(item: ValidatedItem): Promise<DailyAdsRow> {
  const rows = (await query(
    `INSERT INTO public."DailyAdsManual"
      (id, date, spend, cpc, impressions, "createdAt")
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     ON CONFLICT (date) DO UPDATE
     SET
       spend = EXCLUDED.spend,
       cpc = EXCLUDED.cpc,
       impressions = EXCLUDED.impressions,
       "createdAt" = CURRENT_TIMESTAMP
     RETURNING id, date, spend, cpc, impressions, "createdAt"`,
    [crypto.randomUUID(), item.date, item.spend, item.cpc, item.impressions],
  )) as DailyAdsRow[];

  return rows[0];
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json(
      { error: "Não autorizado. Chave de API inválida ou ausente." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | null;

  if (!body) {
    return Response.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  // Suporte a envio em lote (array de múltiplos dias)
  if (Array.isArray(body)) {
    if (body.length === 0) {
      return Response.json(
        { error: "Array de registros vazio." },
        { status: 400 },
      );
    }

    const validatedItems: ValidatedItem[] = [];
    for (let i = 0; i < body.length; i++) {
      const validated = validateDailyItem(body[i]);
      if (!validated) {
        return Response.json(
          { error: `Item no índice ${i} contém dados inválidos (verifique data, gasto, CPC ou impressões).` },
          { status: 400 },
        );
      }
      validatedItems.push(validated);
    }

    try {
      const results: DailyAdsRecord[] = [];
      for (const item of validatedItems) {
        const saved = await upsertRecord(item);
        results.push(serializeRecord(saved));
      }

      return Response.json({
        success: true,
        count: results.length,
        records: results,
      });
    } catch (error) {
      console.error("POST /api/daily-ads (batch)", error);
      return Response.json(
        { error: "Não foi possível salvar os registros em lote." },
        { status: 500 },
      );
    }
  }

  // Registro único
  const validated = validateDailyItem(body);
  if (!validated) {
    return Response.json(
      { error: "Data, gasto, CPC ou impressões inválidos." },
      { status: 400 },
    );
  }

  try {
    const saved = await upsertRecord(validated);
    return Response.json(serializeRecord(saved), { status: 200 });
  } catch (error) {
    console.error("POST /api/daily-ads", error);
    return Response.json(
      { error: "Não foi possível salvar o registro." },
      { status: 500 },
    );
  }
}
