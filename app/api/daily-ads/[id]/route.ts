import { query } from "@/lib/db";
import { isValidBrazilianDate, type DailyAdsRecord } from "@/lib/daily-ads";

type RouteParams = { params: Promise<{ id: string }> };

type DailyAdsRow = {
  id: string;
  date: string;
  spend: string | number;
  cpc: string | number;
  impressions: string | number;
  url_clicks?: string | number | null;
  call_clicks?: string | number | null;
  msg_clicks?: string | number | null;
  revenue?: string | number | null;
  commission?: string | number | null;
  clients?: string | number | null;
  createdAt: Date | string;
};

function serializeRecord(row: DailyAdsRow): DailyAdsRecord {
  return {
    id: row.id,
    date: row.date,
    spend: Number(row.spend),
    cpc: Number(row.cpc),
    impressions: Number(row.impressions),
    urlClicks: row.url_clicks !== null && row.url_clicks !== undefined ? Number(row.url_clicks) : null,
    callClicks: row.call_clicks !== null && row.call_clicks !== undefined ? Number(row.call_clicks) : null,
    msgClicks: row.msg_clicks !== null && row.msg_clicks !== undefined ? Number(row.msg_clicks) : null,
    revenue: row.revenue !== null && row.revenue !== undefined ? Number(row.revenue) : null,
    commission: row.commission !== null && row.commission !== undefined ? Number(row.commission) : null,
    clients: row.clients !== null && row.clients !== undefined ? Number(row.clients) : null,
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

  const rawUrlClicks = body?.urlClicks ?? body?.url_clicks;
  const rawCallClicks = body?.callClicks ?? body?.call_clicks;
  const rawMsgClicks = body?.msgClicks ?? body?.msg_clicks;

  const urlClicks = rawUrlClicks !== undefined && rawUrlClicks !== null && rawUrlClicks !== ""
    ? finiteNumber(rawUrlClicks)
    : null;
  const callClicks = rawCallClicks !== undefined && rawCallClicks !== null && rawCallClicks !== ""
    ? finiteNumber(rawCallClicks)
    : null;
  const msgClicks = rawMsgClicks !== undefined && rawMsgClicks !== null && rawMsgClicks !== ""
    ? finiteNumber(rawMsgClicks)
    : null;

  const revenue = body?.revenue !== undefined && body?.revenue !== null && body?.revenue !== ""
    ? finiteNumber(body?.revenue)
    : null;
  const commission = body?.commission !== undefined && body?.commission !== null && body?.commission !== ""
    ? finiteNumber(body?.commission)
    : null;
  const clients = body?.clients !== undefined && body?.clients !== null && body?.clients !== ""
    ? finiteNumber(body?.clients)
    : null;

  try {
    const rows = (await query(
      `UPDATE public."DailyAdsManual"
       SET date = $2,
           spend = $3,
           cpc = $4,
           impressions = $5,
           url_clicks = $6,
           call_clicks = $7,
           msg_clicks = $8,
           revenue = $9,
           commission = $10,
           clients = $11
       WHERE id = $1
       RETURNING id, date, spend, cpc, impressions, url_clicks, call_clicks, msg_clicks, revenue, commission, clients, "createdAt"`,
      [
        id,
        date,
        spend,
        cpc,
        impressions,
        urlClicks !== null && Number.isInteger(urlClicks) && urlClicks >= 0 ? urlClicks : null,
        callClicks !== null && Number.isInteger(callClicks) && callClicks >= 0 ? callClicks : null,
        msgClicks !== null && Number.isInteger(msgClicks) && msgClicks >= 0 ? msgClicks : null,
        revenue !== null && revenue >= 0 ? revenue : null,
        commission !== null && commission >= 0 ? commission : null,
        clients !== null && Number.isInteger(clients) && clients >= 0 ? clients : null,
      ],
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
