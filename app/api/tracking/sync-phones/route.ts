import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const WAHA_URL = process.env.WAHA_URL || "http://localhost:3000";
const WAHA_API_KEY = process.env.WAHA_API_KEY || "";
const SESSION = "default";

// Janelas de confiança
const WINDOW_TEMPLATE_MS = 5 * 60 * 1000;  // 5 min — com template
const WINDOW_FALLBACK_MS = 60 * 1000;       // 1 min — sem template (só timestamp)

const log = (...args: unknown[]) => console.log("[sync-phones]", ...args);

async function wahaGet(path: string) {
  const res = await fetch(`${WAHA_URL}${path}`, {
    headers: { "X-Api-Key": WAHA_API_KEY },
    cache: "no-store",
  });
  if (!res.ok) {
    log(`GET ${WAHA_URL}${path} → ${res.status}`);
    return null;
  }
  return res.json();
}

function extractPhoneFromChat(chat: {
  id: { _serialized: string; user: string };
  name: string;
  isGroup: boolean;
}): string | null {
  if (chat.isGroup) return null;
  const nameDigits = chat.name.replace(/\D/g, "");
  if (nameDigits.length >= 10 && nameDigits.length <= 15) return nameDigits;
  const userDigits = chat.id.user.replace(/\D/g, "");
  if (userDigits.length >= 10 && userDigits.length <= 15) return userDigits;
  return null;
}

function matchesTemplate(body: string, templates: string[]): boolean {
  const normalized = body.trim().toLowerCase();
  return templates.some((t) => normalized.includes(t.toLowerCase()));
}

interface WahaMessage {
  timestamp: number;
  body: string;
  fromMe: boolean;
}

export async function POST() {
  try {
    log("=== Iniciando sync com templates ===");

    // Buscar templates ativos
    const templateRows = await query(
      `SELECT text FROM public.whatsapp_templates WHERE active = true`
    );
    const templates = templateRows.map((r) => r.text as string);
    log(`Templates ativos: ${templates.length} → ${templates.map((t) => `"${t.slice(0, 30)}..."`).join(", ")}`);

    // Sessões sem telefone com click
    const unmatchedRows = await query(
      `SELECT DISTINCT ts."visitorId",
              MIN(t."createdAt") as first_click_at
       FROM public."TrackingSession" ts
       JOIN public."Tracking" t ON t."visitorId" = ts."visitorId"
       WHERE ts.phone IS NULL
         AND t.event = 'click'
         AND t."isBot" = false
       GROUP BY ts."visitorId"`
    );

    log(`Sessões sem telefone com click: ${unmatchedRows.length}`);
    if (unmatchedRows.length === 0) {
      return NextResponse.json({ matched: 0, message: "Nenhuma sessão sem telefone com click" });
    }

    // Chats do WAHA
    const chats = await wahaGet(`/api/${SESSION}/chats?limit=500`);
    if (!Array.isArray(chats)) {
      return NextResponse.json({ matched: 0, message: "WAHA não retornou conversas" });
    }

    const nonGroupChats = chats.filter((c) => !c.isGroup);
    log(`Chats individuais: ${nonGroupChats.length}`);

    const matched: { visitor_id: string; phone: string; diff_seconds: number; via: string }[] = [];

    for (const chat of nonGroupChats) {
      const phone = extractPhoneFromChat(chat);
      if (!phone) continue;

      const messages: WahaMessage[] | null = await wahaGet(
        `/api/${SESSION}/chats/${encodeURIComponent(chat.id._serialized)}/messages?limit=500&downloadMedia=false`
      );
      if (!Array.isArray(messages) || messages.length === 0) continue;

      // Só mensagens recebidas (não enviadas por mim)
      const received = messages.filter((m) => !m.fromMe);
      if (received.length === 0) continue;

      // 1. Tentar match via template (mais confiável)
      const templateMsgs = received.filter((m) => matchesTemplate(m.body, templates));
      const candidateMsgs = templateMsgs.length > 0 ? templateMsgs : received;
      const window = templateMsgs.length > 0 ? WINDOW_TEMPLATE_MS : WINDOW_FALLBACK_MS;
      const via = templateMsgs.length > 0 ? "template" : "timestamp";

      if (templateMsgs.length > 0) {
        log(`Chat "${chat.name}" (${phone}) → ${templateMsgs.length} msg(s) com template`);
      }

      let bestMatch: { visitorId: string; diffMs: number } | null = null;

      for (const msg of candidateMsgs) {
        const msgTime = msg.timestamp * 1000;

        for (const row of unmatchedRows) {
          const clickTime = new Date(row.first_click_at).getTime();
          const diffMs = msgTime - clickTime;

          if (diffMs >= -2000 && diffMs <= window) {
            if (!bestMatch || Math.abs(diffMs) < Math.abs(bestMatch.diffMs)) {
              bestMatch = { visitorId: row.visitorId, diffMs };
            }
          }
        }
      }

      if (bestMatch) {
        log(`  ✅ [${via}] ${phone} → ${bestMatch.visitorId.slice(0, 8)}... (${(bestMatch.diffMs / 1000).toFixed(0)}s)`);
        await query(
          `UPDATE public."TrackingSession"
           SET phone = $1, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "visitorId" = $2 AND phone IS NULL`,
          [phone, bestMatch.visitorId]
        );
        matched.push({ visitor_id: bestMatch.visitorId, phone, diff_seconds: Math.round(bestMatch.diffMs / 1000), via });
        const idx = unmatchedRows.findIndex((r) => r.visitorId === bestMatch!.visitorId);
        if (idx !== -1) unmatchedRows.splice(idx, 1);
      }
    }

    log(`=== Fim: ${matched.length} match(es) ===`);
    return NextResponse.json({ matched: matched.length, details: matched });
  } catch (error: unknown) {
    console.error("[sync-phones] ERRO:", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
