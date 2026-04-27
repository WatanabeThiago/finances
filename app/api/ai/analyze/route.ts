import { NextRequest, NextResponse } from "next/server";
import { getChats, getChatMessages } from "@/lib/waha-client";
import { analyzeConversation } from "@/lib/gemini-client";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "phone obrigatório" }, { status: 400 });
    }

    const chats = await getChats();
    const phoneDigits = phone.replace(/\D/g, "");

    console.log(`[ai/analyze] Buscando phone="${phone}" (digits="${phoneDigits}") em ${chats.length} chats`);
    chats.slice(0, 5).forEach((c) => {
      const serialized = typeof c.id === "string" ? c.id : (c.id as { _serialized: string })._serialized ?? "";
      console.log(`  chat: name="${c.name}" id_serialized="${serialized}"`);
    });

    const chat = chats.find((c) => {
      if (c.isGroup) return false;
      const serialized = typeof c.id === "string" ? c.id : (c.id as { _serialized: string })._serialized ?? "";
      const chatPhone = serialized.replace(/@.*$/, "").replace(/\D/g, "");
      const namePhone = (c.name ?? "").replace(/\D/g, "");
      return (
        chatPhone === phoneDigits ||
        (namePhone.length >= 10 && namePhone === phoneDigits)
      );
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Conversa não encontrada no WhatsApp para este telefone" },
        { status: 404 }
      );
    }

    const chatId = typeof chat.id === "string" ? chat.id : (chat.id as { _serialized: string })._serialized;
    const messages = await getChatMessages(chatId, 100);
    if (!messages.length) {
      return NextResponse.json(
        { error: "Nenhuma mensagem encontrada" },
        { status: 404 }
      );
    }

    const analysis = await analyzeConversation(messages);
    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error("[ai/analyze] Erro:", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
