import { useEffect, useRef } from 'react';

const POLLING_INTERVAL = 2000; // 2 segundos

export function useTrackingNotifications() {
  const lastNotifiedIdsRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Pedir permissão para notificações
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkNewEvents = async () => {
      try {
        const response = await fetch('/api/tracking/recent');
        if (!response.ok) return;

        const events = (await response.json()) as Array<{
          id: string;
          event: string;
          visitor_id: string;
          created_at: string;
          phone?: string;
          keyword?: string;
          matchtype?: string;
        }>;

        // Identificar eventos novos (não notificados antes)
        const newEvents = events.filter(e => !lastNotifiedIdsRef.current.has(e.id));

        if (newEvents.length > 0) {
          // Agrupar por tipo de evento
          const byEventType = newEvents.reduce(
            (acc, e) => {
              if (!acc[e.event]) acc[e.event] = [];
              acc[e.event].push(e);
              return acc;
            },
            {} as Record<string, typeof newEvents>
          );

          // Mostrar notificação
          Object.entries(byEventType).forEach(([eventType, eventList]) => {
            const emoji = getEmojiForEvent(eventType);
            const count = eventList.length;
            const title = `${emoji} Novo ${getEventLabel(eventType)}`;
            let body: string;
            if (count === 1) {
              const e = eventList[0];
              const parts = [e.phone || 'Visitante anônimo'];
              if (e.keyword) parts.push(`🔑 ${e.keyword}`);
              if (e.matchtype) parts.push(e.matchtype === 'e' ? 'Exata' : e.matchtype === 'p' ? 'Frase' : e.matchtype === 'b' ? 'Ampla' : e.matchtype);
              body = parts.join(' · ');
            } else {
              body = `${count} novos ${getEventLabel(eventType).toLowerCase()}`;
            }

            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(title, {
                  body,
                  icon: '/favicon.ico',
                  badge: '/favicon.ico',
                  tag: eventType,
                  requireInteraction: false,
                });
              } catch (err) {
                console.error('Erro ao mostrar notificação:', err);
              }
            }

            // Adicionar aos já notificados
            eventList.forEach(e => lastNotifiedIdsRef.current.add(e.id));
          });

          // Limpar eventos antigos do set
          if (lastNotifiedIdsRef.current.size > 100) {
            lastNotifiedIdsRef.current = new Set(
              Array.from(lastNotifiedIdsRef.current).slice(-50)
            );
          }
        }
      } catch (error) {
        console.error('Erro ao verificar novos eventos:', error);
      }
    };

    // Executar imediatamente na primeira vez
    checkNewEvents();

    // Configurar polling
    intervalRef.current = setInterval(checkNewEvents, POLLING_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}

function getEmojiForEvent(eventType: string): string {
  switch (eventType.toLowerCase()) {
    case 'page_view':        return '📄';
    case 'click':            return '🫵';
    case 'call':             return '📞';
    case 'scroll_100':       return '✅';
    case 'scroll_75':
    case 'scroll_50':
    case 'scroll_35':
    case 'scroll_25':
    case 'scroll_10':        return '📜';
    case 'copy_phone_click': return '📋';
    case 'address_click':    return '📍';
    default:                 return '📍';
  }
}

function getEventLabel(eventType: string): string {
  switch (eventType.toLowerCase()) {
    case 'page_view':        return 'Visualização';
    case 'click':            return 'Clique';
    case 'call':             return 'Ligação';
    case 'scroll_100':       return 'Scroll 100%';
    case 'scroll_75':        return 'Scroll 75%';
    case 'scroll_50':        return 'Scroll 50%';
    case 'scroll_35':        return 'Scroll 35%';
    case 'scroll_25':        return 'Scroll 25%';
    case 'scroll_10':        return 'Scroll 10%';
    case 'copy_phone_click': return 'Copiou telefone';
    case 'address_click':    return 'Clicou no endereço';
    default:                 return 'Evento';
  }
}
