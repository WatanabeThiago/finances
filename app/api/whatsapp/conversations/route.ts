import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppClient, getClientStatus } from '@/lib/whatsapp-client';

export async function GET(request: NextRequest) {
  try {
    const status = getClientStatus();

    if (!status.isReady) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cliente WhatsApp não está pronto',
          status,
        },
        { status: 503 }
      );
    }

    const client = await getWhatsAppClient();
    const chats = await client.getChats();

    // Filtrar apenas chats com mensagens e ordenar por última mensagem
    const chatsWithMessages = await Promise.all(
      chats.map(async (chat) => {
        const messages = await chat.fetchMessages({ limit: 100 });
        return {
          chat,
          messages: messages.sort((a, b) => a.timestamp - b.timestamp),
        };
      })
    );

    // Pegar os últimos 5 chats (mais recentes)
    const lastChats = chatsWithMessages
      .filter((item) => item.messages.length > 0)
      .sort((a, b) => {
        const lastMsgA = a.messages[a.messages.length - 1]?.timestamp || 0;
        const lastMsgB = b.messages[b.messages.length - 1]?.timestamp || 0;
        return lastMsgB - lastMsgA;
      })
      .slice(0, 5);

    const conversations = lastChats.map((item) => {
      const { chat, messages } = item;
      const firstMsg = messages[0];
      const lastMsg = messages[messages.length - 1];

      // Extrair phone do chat ID (formato: "5511999999999@c.us" ou "5511999999999@g.us")
      const phoneMatch = chat.id.user
        ? String(chat.id.user).match(/^(\d+)/)
        : null;
      const phone = phoneMatch ? phoneMatch[1] : chat.id.user || chat.name;

      return {
        id: chat.id._serialized,
        phone,
        name: chat.name,
        isGroup: chat.isGroup,
        messageCount: messages.length,
        firstMessageAt: new Date(firstMsg.timestamp * 1000).toISOString(),
        lastMessageAt: new Date(lastMsg.timestamp * 1000).toISOString(),
        lastMessage: lastMsg.body.substring(0, 100),
      };
    });

    return NextResponse.json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error: any) {
    console.error('Erro ao buscar conversas:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao buscar conversas',
      },
      { status: 500 }
    );
  }
}
