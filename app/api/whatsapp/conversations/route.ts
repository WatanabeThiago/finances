import { NextResponse } from "next/server";
import { getChats, getChatMessages, extractPhone } from "@/lib/waha-client";

export async function GET() {
  try {
    const chats = await getChats();

    if (!chats.length) {
      return NextResponse.json({ success: true, count: 0, conversations: [] });
    }

    const withMessages = await Promise.all(
      chats.slice(0, 20).map(async (chat) => {
        const messages = await getChatMessages(chat.id, 50);
        return { chat, messages };
      })
    );

    const conversations = withMessages
      .filter((item) => item.messages.length > 0)
      .sort((a, b) => {
        const lastA = a.messages[a.messages.length - 1]?.timestamp ?? 0;
        const lastB = b.messages[b.messages.length - 1]?.timestamp ?? 0;
        return lastB - lastA;
      })
      .slice(0, 10)
      .map(({ chat, messages }) => {
        const first = messages[0];
        const last = messages[messages.length - 1];
        return {
          id: chat.id,
          phone: extractPhone(chat.id),
          name: chat.name,
          isGroup: chat.isGroup,
          messageCount: messages.length,
          firstMessageAt: new Date(first.timestamp * 1000).toISOString(),
          lastMessageAt: new Date(last.timestamp * 1000).toISOString(),
          lastMessage: last.body.substring(0, 100),
        };
      });

    return NextResponse.json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar conversas";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
