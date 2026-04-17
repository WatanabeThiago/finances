'use client';

import { useState } from 'react';
import { CallButton } from './call-button';
import { ContactRequestForm } from './contact-request-form';

interface LPActionsProps {
  visitorId?: string;
  userAgent?: string;
  className?: string;
}

export function LPActions({ visitorId, userAgent, className = '' }: LPActionsProps) {
  const [showContactForm, setShowContactForm] = useState(false);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <CallButton visitorId={visitorId} userAgent={userAgent} className="w-full sm:w-auto" />

      {!showContactForm ? (
        <button
          onClick={() => setShowContactForm(true)}
          className="inline-flex items-center justify-center px-4 py-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold rounded-lg transition-colors duration-200"
        >
          Não consegui entrar em contato
        </button>
      ) : (
        <ContactRequestForm onClose={() => setShowContactForm(false)} />
      )}
    </div>
  );
}
