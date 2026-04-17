'use client';

import { useEffect, useState } from 'react';
import { Phone, X, Loader } from 'lucide-react';

interface ContactRequestRecord {
  id: string;
  phone: string;
  created_at: string;
  respondedAt: string | null;
}

export function ContactRequestsScreen() {
  const [requests, setRequests] = useState<ContactRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000); // Atualizar a cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/contact-requests');
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Erro ao buscar requisições:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsResponded = async (id: string) => {
    try {
      const response = await fetch(`/api/contact-requests/${id}`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setCompletedIds((prev) => new Set(prev).add(id));
        // Remover da lista após animação
        setTimeout(() => {
          setRequests((prev) => prev.filter((req) => req.id !== id));
          setCompletedIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
        }, 500);
      }
    } catch (error) {
      console.error('Erro ao marcar como respondido:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <Phone className="w-12 h-12 text-gray-400 mb-3" />
        <p className="text-gray-600 font-semibold">Nenhuma requisição pendente</p>
        <p className="text-gray-500 text-sm mt-1">Todos os contatos foram respondidos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
        <p className="font-semibold text-amber-900">
          📞 {requests.length} {requests.length === 1 ? 'requisição' : 'requisições'} de contato pendente
        </p>
      </div>

      <div className="grid gap-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className={`
              bg-white border-2 border-amber-200 rounded-lg p-4 flex items-center justify-between
              transition-all duration-300
              ${completedIds.has(request.id) ? 'opacity-50 scale-95' : ''}
            `}
          >
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                <span className="text-amber-600">📱</span> {request.phone}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                Solicitado em: {new Date(request.created_at).toLocaleString('pt-BR')}
              </p>
            </div>

            <button
              onClick={() => handleMarkAsResponded(request.id)}
              disabled={completedIds.has(request.id)}
              className="flex-shrink-0 p-2 ml-4 bg-green-100 hover:bg-green-200 disabled:bg-gray-200 text-green-700 disabled:text-gray-500 rounded-lg transition-colors"
              title="Marcar como respondido"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
