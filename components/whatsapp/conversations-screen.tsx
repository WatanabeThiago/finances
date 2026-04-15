import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Conversation {
  id: string;
  phone: string;
  name: string;
  isGroup: boolean;
  isBroadcast: boolean;
  messageCount: number;
  firstMessageAt: string;
  lastMessageAt: string;
  lastMessage: string;
}

export function ConversationsScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConversations() {
      try {
        setLoading(true);
        const response = await fetch('/api/whatsapp/conversations');
        const data = await response.json();

        if (data.success) {
          setConversations(data.conversations);
          setError(null);
        } else {
          setError(data.error || 'Erro ao buscar conversas');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    // Buscar na primeira renderização e depois a cada 5 segundos
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Carregando conversas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Erro: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-8">
      <h2 className="text-2xl font-bold">Últimas Conversas ({conversations.length})</h2>

      <div className="grid gap-4">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className="p-4 border border-gray-200 rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-lg">
                  {conv.isGroup ? '👥' : '👤'} {conv.name}
                </h3>
                <p className="text-sm text-gray-500">{conv.phone}</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                {conv.messageCount} mensagens
              </div>
            </div>

            <p className="text-sm mb-3 text-gray-600 dark:text-gray-400 truncate">
              Última: {conv.lastMessage}
            </p>

            <div className="flex justify-between text-xs text-gray-500">
              <span>
                Primeira: {format(new Date(conv.firstMessageAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </span>
              <span>
                Última: {format(new Date(conv.lastMessageAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {conversations.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          Nenhuma conversa encontrada
        </div>
      )}
    </div>
  );
}
