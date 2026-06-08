import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import PageHeader from '@/components/ui/premium/PageHeader';
import AiAssistantClient from '@/components/ai/AiAssistantClient';
import { Bot } from 'lucide-react';

export const metadata = {
  title: 'AI Assistant',
  description: 'Clinic AI assistant for workflows, drafts, and operational guidance.',
};

export default async function AiAssistantPage() {
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/ai-assistant');
  if (denied) return denied;

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Assistant"
        description="Get help with clinic workflows, draft owner communications, and operational guidance. Powered by your configured LLM (Groq)."
        icon={Bot}
      />
      <AiAssistantClient />
    </div>
  );
}
