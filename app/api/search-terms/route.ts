import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "pending";

    const rows = await query(
      `SELECT id, term, campaign_id, impressions, clicks, cost, conversions, status, synced_at, reviewed_at
       FROM search_terms
       WHERE status = $1
       ORDER BY clicks DESC`,
      [status]
    );

    return Response.json(rows);
  } catch (error) {
    console.error("[search-terms GET] erro:", error);
    return Response.json({ error: "Erro interno", detail: String(error) }, { status: 500 });
  }
}
