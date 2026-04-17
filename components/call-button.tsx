'use client';

import { useState } from 'react';
import { Phone } from 'lucide-react';

interface CallButtonProps {
  visitorId?: string;
  userAgent?: string;
  className?: string;
}

export function CallButton({ visitorId, userAgent, className = '' }: CallButtonProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCall = async () => {
    try {
      setLoading(true);

      // Registrar evento de "call" no tracking
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'call',
          visitor_id: visitorId || 'unknown',
          user_agent: userAgent || navigator.userAgent,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Erro ao registrar ligação:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCall}
      disabled={loading}
      className={`
        inline-flex items-center justify-center gap-2 px-4 py-2
        bg-green-600 hover:bg-green-700 disabled:bg-green-500
        text-white font-semibold rounded-lg
        transition-colors duration-200
        ${success ? 'bg-green-500' : ''}
        ${className}
      `}
    >
      <Phone className="w-5 h-5" />
      {success ? 'Ligação registrada!' : loading ? 'Ligando...' : 'Ligar Agora'}
    </button>
  );
}
