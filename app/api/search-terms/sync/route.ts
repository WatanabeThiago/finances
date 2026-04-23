import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { secret, terms } = body;

    if (!process.env.GOOGLE_ADS_SYNC_SECRET) {
      return Response.json({ error: "Servidor não configurado" }, { status: 500 });
    }

    if (secret !== process.env.GOOGLE_ADS_SYNC_SECRET) {
      return Response.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (!Array.isArray(terms) || terms.length === 0) {
      return Response.json({ error: "Campo obrigatório: terms (array)" }, { status: 400 });
    }

    let inserted = 0;
    let updated = 0;

    for (const t of terms) {
      const result = await query(
        `INSERT INTO search_terms (term, campaign_id, impressions, clicks, cost, conversions)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (term, campaign_id) DO UPDATE
           SET impressions = EXCLUDED.impressions,
               clicks = EXCLUDED.clicks,
               cost = EXCLUDED.cost,
               conversions = EXCLUDED.conversions,
               synced_at = CURRENT_TIMESTAMP
         RETURNING (xmax = 0) AS is_insert`,
        [
          String(t.term),
          String(t.campaignId ?? ""),
          Number(t.impressions ?? 0),
          Number(t.clicks ?? 0),
          Number(t.cost ?? 0),
          Number(t.conversions ?? 0),
        ]
      );
      if (result[0]?.is_insert) inserted++;
      else updated++;
    }

    return Response.json({ inserted, updated, total: terms.length });
  } catch (error) {
    console.error("[search-terms/sync POST] erro:", error);
    return Response.json({ error: "Erro interno", detail: String(error) }, { status: 500 });
  }
}
