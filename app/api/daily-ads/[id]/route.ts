import { query } from "@/lib/db";
import { isValidBrazilianDate, type DailyAdsRecord } from "@/lib/daily-ads";

type RouteParams = { params: Promise<{ id: string }> };

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

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
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
      `UPDATE public."DailyAdsManual"
       SET date = $2, spend = $3, cpc = $4, impressions = $5
       WHERE id = $1
       RETURNING id, date, spend, cpc, impressions, "createdAt"`,
      [id, date, spend, cpc, impressions],
    )) as DailyAdsRow[];

    if (!rows[0]) {
      return Response.json(
        { error: "Registro não encontrado." },
        { status: 404 },
      );
    }

    return Response.json(serializeRecord(rows[0]));
  } catch (error) {
    if (hasDatabaseCode(error, "23505")) {
      return Response.json(
        { error: "Já existe um registro para essa data." },
        { status: 409 },
      );
    }

    console.error(`PATCH /api/daily-ads/${id}`, error);
    return Response.json(
      { error: "Não foi possível atualizar o registro." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const rows = await query(
      `DELETE FROM public."DailyAdsManual" WHERE id = $1 RETURNING id`,
      [id],
    );

    if (!rows[0]) {
      return Response.json(
        { error: "Registro não encontrado." },
        { status: 404 },
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(`DELETE /api/daily-ads/${id}`, error);
    return Response.json(
      { error: "Não foi possível excluir o registro." },
      { status: 500 },
    );
  }
}
