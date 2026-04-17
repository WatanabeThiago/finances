'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface ContactRequestFormProps {
  onClose?: () => void;
  className?: string;
}

export function ContactRequestForm({ onClose, className = '' }: ContactRequestFormProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const formatPhone = (value: string) => {
    // Remove tudo que não é número
    const digits = value.replace(/\D/g, '');
    
    // Formata o telefone
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length < 10) {
      setError('Telefone deve ter pelo menos 10 dígitos');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/contact-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar requisição');
      }

      setSuccess(true);
      setPhone('');

      // Fechar modal após 2 segundos
      setTimeout(() => {
        onClose?.();
      }, 2000);
    } catch (error) {
      setError('Erro ao enviar. Tente novamente.');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Não consegui entrar em contato
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {success ? (
          <div className="text-center py-4">
            <p className="text-green-600 font-semibold">
              ✓ Obrigado! Em breve entraremos em contato.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Seu telefone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
            </div>

            <p className="text-sm text-gray-600">
              Digite seu telefone para que possamos entrar em contato quando estiver disponível.
            </p>

            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, '').length < 10}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              {loading ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
