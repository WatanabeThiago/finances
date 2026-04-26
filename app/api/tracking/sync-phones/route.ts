import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const WAHA_URL = process.env.WAHA_URL || "http://localhost:3000";
const WAHA_API_KEY = process.env.WAHA_API_KEY || "";
const SESSION = "default";
const WINDOW_MS = 2 * 60 * 60 * 1000; // 2 horas (era 30 min)
const MESSAGES_LIMIT = 500;            // era 50

const log = (...args: unknown[]) => console.log("[sync-phones]", ...args);

async function wahaGet(path: string) {
  const url = `${WAHA_URL}${path}`;
  const res = await fetch(url, {
    headers: { "X-Api-Key": WAHA_API_KEY },
    cache: "no-store",
  });
  if (!res.ok) {
    log(`GET ${url} → ${res.status} ${await res.text()}`);
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

async function getMessagesTimestamps(chatId: string): Promise<number[]> {
  const messages = await wahaGet(
    `/api/${SESSION}/chats/${encodeURIComponent(chatId)}/messages?limit=${MESSAGES_LIMIT}&downloadMedia=false`
  );
  if (!Array.isArray(messages) || messages.length === 0) return [];
  return messages.map((m: { timestamp: number }) => m.timestamp * 1000);
}

export async function POST() {
  try {
    log(`=== Iniciando sync (janela=${WINDOW_MS / 60000}min, limit=${MESSAGES_LIMIT} msgs) ===`);

    // 1. Sessões sem telefone com click
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

    // 2. Chats do WAHA
    const chats = await wahaGet(`/api/${SESSION}/chats?limit=500`);
    if (!Array.isArray(chats)) {
      return NextResponse.json({ matched: 0, message: "WAHA não retornou conversas" });
    }

    const nonGroupChats = chats.filter((c) => !c.isGroup);
    log(`Chats individuais: ${nonGroupChats.length} de ${chats.length} total`);

    const matched: { visitor_id: string; phone: string; diff_seconds: number }[] = [];
    const noMatchChats: { phone: string; closest_diff_min: number | null }[] = [];

    for (const chat of nonGroupChats) {
      const phone = extractPhoneFromChat(chat);
      if (!phone) continue;

      const timestamps = await getMessagesTimestamps(chat.id._serialized);
      if (timestamps.length === 0) continue;

      const minTs = Math.min(...timestamps);
      const maxTs = Math.max(...timestamps);
      log(`Chat "${chat.name}" (${phone}) — ${timestamps.length} msgs, range: ${new Date(minTs).toISOString()} → ${new Date(maxTs).toISOString()}`);

      let bestMatch: { visitorId: string; diffMs: number } | null = null;

      for (const row of unmatchedRows) {
        const clickTime = new Date(row.first_click_at).getTime();

        // Checar se QUALQUER mensagem da conversa está na janela após o click
        const matchingTs = timestamps.filter(
          (ts) => ts >= clickTime - 2 * 60 * 1000 && ts <= clickTime + WINDOW_MS
        );

        if (matchingTs.length > 0) {
          const closestTs = matchingTs.reduce((best, ts) =>
            Math.abs(ts - clickTime) < Math.abs(best - clickTime) ? ts : best
          );
          const diffMs = closestTs - clickTime;
          log(`  → visitor ${row.visitorId.slice(0, 8)}... click=${new Date(clickTime).toISOString()} diff=${(diffMs / 60000).toFixed(1)}min`);
          if (!bestMatch || Math.abs(diffMs) < Math.abs(bestMatch.diffMs)) {
            bestMatch = { visitorId: row.visitorId, diffMs };
          }
        }
      }

      if (bestMatch) {
        log(`  ✅ MATCH: ${phone} → ${bestMatch.visitorId.slice(0, 8)}... (${(bestMatch.diffMs / 1000).toFixed(0)}s)`);
        await query(
          `UPDATE public."TrackingSession"
           SET phone = $1, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "visitorId" = $2 AND phone IS NULL`,
          [phone, bestMatch.visitorId]
        );
        matched.push({ visitor_id: bestMatch.visitorId, phone, diff_seconds: Math.round(bestMatch.diffMs / 1000) });
        const idx = unmatchedRows.findIndex((r) => r.visitorId === bestMatch!.visitorId);
        if (idx !== -1) unmatchedRows.splice(idx, 1);
      } else {
        // Calcular o diff mais próximo para debug
        let closestDiff: number | null = null;
        for (const row of unmatchedRows) {
          const clickTime = new Date(row.first_click_at).getTime();
          const diffs = timestamps.map((ts) => (ts - clickTime) / 60000);
          const closest = diffs.reduce((best, d) => (Math.abs(d) < Math.abs(best) ? d : best));
          if (closestDiff === null || Math.abs(closest) < Math.abs(closestDiff)) closestDiff = closest;
        }
        log(`  ✗ sem match — diff mais próximo: ${closestDiff?.toFixed(1)}min`);
        noMatchChats.push({ phone, closest_diff_min: closestDiff });
      }
    }

    log(`=== Fim: ${matched.length} match(es) ===`);
    if (unmatchedRows.length > 0) {
      log(`Ainda sem match (${unmatchedRows.length} sessões):`);
      unmatchedRows.forEach((r) => log(`  visitor=${r.visitorId.slice(0, 8)}... click=${r.first_click_at}`));
    }

    return NextResponse.json({ matched: matched.length, details: matched });
  } catch (error: unknown) {
    console.error("[sync-phones] ERRO:", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
