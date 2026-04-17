'use client';

import { useContactRequests } from '@/lib/use-contact-requests';
import { X, Bell } from 'lucide-react';

export function ContactRequestNotifications() {
  const { requests, closeRequest } = useContactRequests();

  if (requests.length === 0) return null;

  // Mostrar apenas as 3 primeiras notificações
  const visibleRequests = requests.slice(0, 3);
  const hiddenCount = Math.max(0, requests.length - 3);

  return (
    <div className="fixed top-4 right-4 flex flex-col gap-2 z-50 max-w-sm">
      {visibleRequests.map((request, index) => (
        <div
          key={request.id}
          className="bg-white border border-gray-200 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow animate-in slide-in-from-top-2 duration-300"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-blue-600" />
                <p className="font-semibold text-gray-900 text-sm">Novo pedido de contato</p>
              </div>
              <p className="text-gray-800 font-mono font-bold text-base">
                {request.phone}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {new Date(request.created_at).toLocaleTimeString('pt-BR')}
              </p>
            </div>
            <button
              onClick={() => closeRequest(request.id)}
              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-600"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {hiddenCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center animate-in slide-in-from-top-2 duration-300">
          <p className="text-blue-700 text-sm font-semibold">
            + {hiddenCount} {hiddenCount === 1 ? 'pedido' : 'pedidos'} de contato não atendidos
          </p>
        </div>
      )}
    </div>
  );
}
