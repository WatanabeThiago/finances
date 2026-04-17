import { useState, useEffect, useRef } from 'react';

export interface ContactRequest {
  id: string;
  phone: string;
  created_at: string;
}

export function useContactRequests() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contact-requests');
      if (!response.ok) throw new Error('Falha ao buscar requisições');

      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Erro ao buscar requisições de contato:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeRequest = async (id: string) => {
    try {
      const response = await fetch(`/api/contact-requests/${id}`, {
        method: 'PATCH',
      });

      if (response.ok) {
        // Remover da lista local
        setRequests((prev) => prev.filter((req) => req.id !== id));
      }
    } catch (error) {
      console.error('Erro ao fechar requisição:', error);
    }
  };

  useEffect(() => {
    // Buscar na primeira vez
    fetchRequests();

    // Buscar a cada 10 segundos
    intervalRef.current = setInterval(fetchRequests, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { requests, loading, closeRequest };
}
