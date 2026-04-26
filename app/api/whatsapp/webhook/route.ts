import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { extractPhone } from "@/lib/waha-client";

interface WahaWebhookPayload {
  event: string;
  session: string;
  payload: {
    from: string;
    timestamp: number;
    fromMe: boolean;
    body?: string;
  };
}

async function getActiveTemplates(): Promise<string[]> {
  const rows = await query(
    `SELECT text FROM public.whatsapp_templates WHERE active = true`
  );
  return rows.map((r) => r.text as string);
}

function matchesTemplate(body: string, templates: string[]): boolean {
  const normalized = body.trim().toLowerCase();
  return templates.some((t) => normalized.includes(t.toLowerCase()));
}

async function correlatePhone(
  phone: string,
  messageTime: Date,
  isTemplateMatch: boolean
): Promise<string | null> {
  // Com template: janela de 5 min. Sem template: janela de 1 min.
  const windowSeconds = isTemplateMatch ? 300 : 60;

  const rows = await query(
    `SELECT ts."visitorId"
     FROM public."TrackingSession" ts
     JOIN public."Tracking" t ON t."visitorId" = ts."visitorId"
     WHERE ts.phone IS NULL
       AND t.event = 'click'
       AND t."isBot" = false
       AND t."createdAt" BETWEEN ($1::timestamptz - INTERVAL '2 seconds')
                              AND ($1::timestamptz + make_interval(secs => $2))
     ORDER BY ABS(EXTRACT(EPOCH FROM (t."createdAt" - $1::timestamptz))) ASC
     LIMIT 1`,
    [messageTime.toISOString(), windowSeconds]
  );

  if (!rows.length) return null;

  const visitorId = rows[0].visitorId;
  await query(
    `UPDATE public."TrackingSession"
     SET phone = $1, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "visitorId" = $2 AND phone IS NULL`,
    [phone, visitorId]
  );

  return visitorId;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    const expectedKey = process.env.WAHA_API_KEY;
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: WahaWebhookPayload = await request.json();

    if (body.event !== "message" || body.payload?.fromMe) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const phone = extractPhone(body.payload.from);
    const messageTime = new Date(body.payload.timestamp * 1000);
    const msgBody = body.payload.body ?? "";

    const templates = await getActiveTemplates();
    const isTemplateMatch = templates.length > 0 && matchesTemplate(msgBody, templates);

    console.log(`[webhook] ${phone} | template=${isTemplateMatch} | "${msgBody.slice(0, 50)}"`);

    const visitorId = await correlatePhone(phone, messageTime, isTemplateMatch);

    if (visitorId) {
      console.log(`[webhook] ✅ Correlacionado: ${phone} → ${visitorId} (via ${isTemplateMatch ? "template" : "timestamp"})`);
      return NextResponse.json({ ok: true, matched: true, visitor_id: visitorId, phone, via: isTemplateMatch ? "template" : "timestamp" });
    }

    console.log(`[webhook] ✗ Sem match para ${phone}`);
    return NextResponse.json({ ok: true, matched: false });
  } catch (error: unknown) {
    console.error("[webhook] Erro:", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
