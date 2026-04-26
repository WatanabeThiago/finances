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

async function correlatePhone(phone: string, messageTimestamp: Date): Promise<string | null> {
  const rows = await query(
    `SELECT ts."visitorId"
     FROM public."TrackingSession" ts
     JOIN public."Tracking" t ON t."visitorId" = ts."visitorId"
     WHERE ts.phone IS NULL
       AND t.event = 'click'
       AND t."isBot" = false
       AND t."createdAt" BETWEEN ($1::timestamptz - INTERVAL '30 minutes')
                              AND ($1::timestamptz + INTERVAL '2 minutes')
     ORDER BY ABS(EXTRACT(EPOCH FROM (t."createdAt" - $1::timestamptz))) ASC
     LIMIT 1`,
    [messageTimestamp.toISOString()]
  );

  if (!rows.length) return null;

  const visitorId = rows[0].visitorId;

  await query(
    `UPDATE public."TrackingSession"
     SET phone = $1, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "visitorId" = $2`,
    [phone, visitorId]
  );

  return visitorId;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const apiKey = request.headers.get("x-api-key");
    const expectedKey = process.env.WAHA_API_KEY;
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: WahaWebhookPayload = await request.json();

    // Só processar eventos de mensagem recebida (não enviada)
    if (body.event !== "message" || body.payload?.fromMe) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const phone = extractPhone(body.payload.from);
    const messageTime = new Date(body.payload.timestamp * 1000);

    const visitorId = await correlatePhone(phone, messageTime);

    if (visitorId) {
      console.log(`[webhook] Correlacionado: ${phone} → ${visitorId}`);
      return NextResponse.json({ ok: true, matched: true, visitor_id: visitorId, phone });
    }

    console.log(`[webhook] Sem match para ${phone} em ${messageTime.toISOString()}`);
    return NextResponse.json({ ok: true, matched: false });
  } catch (error: unknown) {
    console.error("[webhook] Erro:", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
