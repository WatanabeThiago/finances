import { useEffect, useRef, useState } from 'react';
import { playNotificationSound } from './notification-sound';

export interface TrackingEvent {
  id: string;
  event: string;
  visitor_id?: string;
  session_id?: string;
  created_at: string;
  phone?: string;
}

export function useTrackingNotificationsVisual() {
  const [notifications, setNotifications] = useState<TrackingEvent[]>([]);
  const lastNotifiedIdsRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  const checkNewEvents = async () => {
    try {
      const response = await fetch('/api/tracking/recent');
      if (!response.ok) return;

      const events = (await response.json()) as TrackingEvent[];

      // Identificar eventos novos (não notificados antes)
      const newEvents = events.filter((e) => !lastNotifiedIdsRef.current.has(e.id));

      if (newEvents.length > 0) {
        // Tocar som
        playNotificationSound();
        // Adicionar aos já notificados
        newEvents.forEach((e) => {
          lastNotifiedIdsRef.current.add(e.id);
        });

        // Adicionar à fila de exibição
        setNotifications((prev) => [...newEvents, ...prev]);

        // Auto-remover após 5 segundos
        newEvents.forEach((event) => {
          setTimeout(() => {
            removeNotification(event.id);
          }, 5000);
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

  useEffect(() => {
    checkNewEvents();
    intervalRef.current = setInterval(checkNewEvents, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { notifications, removeNotification };
}
