'use server';

import { z } from 'zod';
import {
  assertCapability,
  assertFeature,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { chatCompletion, type ChatMessage } from '@/lib/ai/llm-client';
import { createClient } from '@/lib/supabase/server';

const ChatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1).max(4000),
    })
  ),
});

const SYSTEM_PROMPT = `You are ClinixDev AI, a helpful assistant for veterinary clinic staff using the ClinixDev platform.
You help with:
- Front-desk workflows (appointments, walk-ins, checkout)
- Clinical documentation tips (not diagnoses — remind users to consult the veterinarian)
- Inventory and billing questions
- Patient communication drafts (appointment reminders, post-visit care instructions)

Be concise, professional, and practical. Use bullet points when listing steps.
Never invent patient data. If asked for medical diagnosis, explain you can only suggest documentation structure, not diagnose.
Clinic context may be provided below — use it when relevant.`;

async function loadClinicContext(organizationId: string, branchId: string | null) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [apptRes, walkInRes, lowStockRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('appointment_date', today),
    branchId
      ? supabase
          .from('visits')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('branch_id', branchId)
          .in('status', ['waiting', 'consulting'])
      : Promise.resolve({ count: 0 }),
    branchId
      ? supabase
          .from('products')
          .select('name, stock_quantity, reorder_level')
          .eq('organization_id', organizationId)
          .eq('branch_id', branchId)
          .neq('type', 'service')
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  const lowStock =
    (lowStockRes.data as { name: string; stock_quantity: number; reorder_level: number }[] | null)?.filter(
      (p) => p.stock_quantity <= p.reorder_level
    ) ?? [];

  return {
    todayAppointments: apptRes.count ?? 0,
    activeWalkIns: walkInRes.count ?? 0,
    lowStockItems: lowStock.slice(0, 5).map((p) => p.name),
  };
}

export async function aiAssistantChatAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertCapability(ctx, 'use_ai_assistant');
    assertFeature(ctx, 'ai_assistant');

    const parsed = ChatSchema.parse(payload);
    const snapshot = await loadClinicContext(ctx.organizationId!, ctx.activeBranchId);

    const contextBlock = `Today's clinic snapshot:
- Appointments today: ${snapshot.todayAppointments}
- Walk-ins in queue: ${snapshot.activeWalkIns}
- Low stock alerts: ${snapshot.lowStockItems.length ? snapshot.lowStockItems.join(', ') : 'none'}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\n${contextBlock}` },
      ...parsed.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const result = await chatCompletion(messages);
    if ('error' in result) {
      return { success: false, error: result.error };
    }

    return { success: true, reply: result.content };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'AI assistant request failed.',
    };
  }
}
