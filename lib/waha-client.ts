const WAHA_URL = process.env.WAHA_URL || "http://localhost:3000";
const WAHA_API_KEY = process.env.WAHA_API_KEY || "";

const SESSION = "default";

async function wahaFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${WAHA_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": WAHA_API_KEY,
      ...options?.headers,
    },
  });
  return res;
}

export type WahaSessionStatus =
  | "STOPPED"
  | "STARTING"
  | "SCAN_QR_CODE"
  | "WORKING"
  | "FAILED";

export interface WahaSession {
  name: string;
  status: WahaSessionStatus;
  me?: { id: string; pushName: string };
}

export interface WahaChat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: {
    body: string;
    timestamp: number;
    fromMe: boolean;
  };
}

export interface WahaMessage {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  fromMe: boolean;
  body: string;
  hasMedia: boolean;
}

export async function getSessionStatus(): Promise<WahaSession | null> {
  try {
    const res = await wahaFetch(`/api/sessions/${SESSION}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function startSession(): Promise<WahaSession | null> {
  try {
    const res = await wahaFetch(`/api/sessions`, {
      method: "POST",
      body: JSON.stringify({ name: SESSION }),
    });
    if (!res.ok) {
      // Session may already exist — try to fetch current status
      return getSessionStatus();
    }
    return res.json();
  } catch {
    return null;
  }
}

export async function getChats(): Promise<WahaChat[]> {
  try {
    const res = await wahaFetch(`/api/${SESSION}/chats`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getChatMessages(
  chatId: string,
  limit = 20
): Promise<WahaMessage[]> {
  try {
    const res = await wahaFetch(
      `/api/${SESSION}/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}&downloadMedia=false`
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export function extractPhone(waId: string): string {
  return waId.replace(/@.*$/, "");
}
