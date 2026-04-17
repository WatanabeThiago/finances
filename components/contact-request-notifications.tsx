'use client';

import { useContactRequests } from '@/lib/use-contact-requests';
import { X } from 'lucide-react';

export function ContactRequestNotifications() {
  const { requests, closeRequest } = useContactRequests();

  if (requests.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-3 z-50 max-w-sm">
      {requests.map((request) => (
        <div
          key={request.id}
          className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 shadow-lg animate-in slide-in-from-right flex items-start justify-between gap-3"
        >
          <div className="flex-1">
            <p className="font-semibold text-amber-900">📞 Pedido de contato</p>
            <p className="text-amber-800 text-sm mt-1">
              <span className="font-mono font-bold text-lg">{request.phone}</span>
            </p>
            <p className="text-amber-700 text-xs mt-2">
              {new Date(request.created_at).toLocaleTimeString('pt-BR')}
            </p>
          </div>
          <button
            onClick={() => closeRequest(request.id)}
            className="flex-shrink-0 p-1 hover:bg-amber-200 rounded transition-colors"
            aria-label="Fechar notificação"
          >
            <X className="w-5 h-5 text-amber-800" />
          </button>
        </div>
      ))}
    </div>
  );
}
