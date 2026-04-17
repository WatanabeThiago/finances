'use client';

import { useTrackingNotificationsVisual } from '@/lib/use-tracking-notifications-visual';
import { X } from 'lucide-react';

function getEmojiForEvent(eventType: string): string {
  switch (eventType?.toLowerCase()) {
    case 'page_view':
      return '📄';
    case 'click':
      return '🫵';
    case 'call':
      return '📞';
    default:
      return '📍';
  }
}

function getLabelForEvent(eventType: string): string {
  switch (eventType?.toLowerCase()) {
    case 'page_view':
      return 'Visualização';
    case 'click':
      return 'Clique';
    case 'call':
      return 'Ligação';
    default:
      return 'Evento';
  }
}

export function TrackingNotificationsVisual() {
  const { notifications, removeNotification } = useTrackingNotificationsVisual();

  if (notifications.length === 0) return null;

  // Mostrar apenas as 5 primeiras notificações
  const visibleNotifications = notifications.slice(0, 5);

  return (
    <div className="fixed top-16 left-4 flex flex-col gap-2 z-50 max-w-sm">
      {visibleNotifications.map((notif, index) => {
        const emoji = getEmojiForEvent(notif.event);
        const label = getLabelForEvent(notif.event);
        
        return (
          <div
            key={notif.id}
            className="bg-white border border-green-300 rounded-lg p-3 shadow-lg hover:shadow-xl transition-shadow animate-in slide-in-from-left-2 duration-300 backdrop-blur-sm bg-white/95"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{emoji}</span>
                  <p className="font-semibold text-gray-900 text-sm">
                    Novo {label.toLowerCase()}
                  </p>
                </div>
                {notif.phone && (
                  <p className="text-gray-800 font-mono font-bold text-sm">
                    {notif.phone}
                  </p>
                )}
                {notif.session_id && (
                  <p className="text-gray-600 font-mono text-xs breaks-all">
                    ID: {notif.session_id.substring(0, 8)}...
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  {new Date(notif.created_at).toLocaleTimeString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => removeNotification(notif.id)}
                className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-600"
                aria-label="Fechar notificação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
