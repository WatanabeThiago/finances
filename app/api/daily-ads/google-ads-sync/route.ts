import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { secret, date, gastosGoogleAds, cpc } = body;

    console.log("[google-ads-sync POST] body recebido:", JSON.stringify({ date, gastosGoogleAds, cpc, secretOk: secret === process.env.GOOGLE_ADS_SYNC_SECRET }));

    if (!process.env.GOOGLE_ADS_SYNC_SECRET) {
      console.error("[google-ads-sync POST] GOOGLE_ADS_SYNC_SECRET não configurado");
      return Response.json({ error: "Servidor não configurado" }, { status: 500 });
    }

    if (secret !== process.env.GOOGLE_ADS_SYNC_SECRET) {
      console.error("[google-ads-sync POST] secret inválido");
      return Response.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (!date || gastosGoogleAds === undefined || cpc === undefined) {
      return Response.json({ error: "Campos obrigatórios: date, gastosGoogleAds, cpc" }, { status: 400 });
    }

    await query(
      `INSERT INTO google_ads_cache (date, gastos_google_ads, cpc, synced_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (date) DO UPDATE
         SET gastos_google_ads = EXCLUDED.gastos_google_ads,
             cpc = EXCLUDED.cpc,
             synced_at = CURRENT_TIMESTAMP`,
      [date, Number(gastosGoogleAds), Number(cpc)]
    );

    return Response.json({ success: true, date });
  } catch (error) {
    console.error("Erro no google-ads-sync POST:", error);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    console.log("[google-ads-sync GET] date recebido:", date);

    if (!date) {
      return Response.json({ error: "Parâmetro date obrigatório" }, { status: 400 });
    }

    // Verifica se a tabela existe
    const tableCheck = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'google_ads_cache'
      ) as exists`
    );
    console.log("[google-ads-sync GET] tabela existe:", tableCheck[0]?.exists);

    // Lista todos os registros para debug
    const allRows = await query(`SELECT date::text, gastos_google_ads, cpc FROM google_ads_cache ORDER BY date DESC LIMIT 10`);
    console.log("[google-ads-sync GET] registros na tabela:", JSON.stringify(allRows));

    const rows = await query(
      `SELECT gastos_google_ads, cpc, synced_at FROM google_ads_cache WHERE date = $1`,
      [date]
    );
    console.log("[google-ads-sync GET] rows para date", date, ":", JSON.stringify(rows));

    if (rows.length === 0) {
      return Response.json({ error: "Sem dados para esta data", debug: { date, totalRegistros: allRows.length, registros: allRows } }, { status: 404 });
    }

    const row = rows[0];
    return Response.json({
      gastosGoogleAds: parseFloat(row.gastos_google_ads),
      cpc: parseFloat(row.cpc),
      syncedAt: row.synced_at,
    });
  } catch (error) {
    console.error("Erro no google-ads-sync GET:", error);
    return Response.json({ error: "Erro interno", detail: String(error) }, { status: 500 });
  }
}
