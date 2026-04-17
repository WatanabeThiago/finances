import { PageIntro } from '@/components/page-intro';
import { ContactRequestsScreen } from '@/components/contact-requests/contact-requests-screen';

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
