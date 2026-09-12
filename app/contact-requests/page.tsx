import type { Metadata } from 'next';
import { PageIntro } from '@/components/page-intro';
import { ContactRequestsScreen } from '@/components/contact-requests/contact-requests-screen';

export const metadata: Metadata = {
  title: "Requisições de Contato",
};

export default function ContactRequestsPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        title="Requisições de Contato"
      />
      <ContactRequestsScreen />
    </div>
  );
}
