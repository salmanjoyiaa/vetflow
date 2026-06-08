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
Answer questions using ONLY the clinic data provided in the context block below.
If the data does not contain an answer, say you do not have that information in the clinic records.
Never invent patient, customer, or staff data.
Be concise, professional, and practical. Use bullet points when listing items.`;

async function loadClinicContext(organizationId: string, branchId: string | null) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [
    apptRes,
    walkInRes,
    lowStockRes,
    customersRes,
    petsRes,
    apptListRes,
    invoicesRes,
    staffRes,
    productsRes,
  ] = await Promise.all([
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
          .limit(30)
      : Promise.resolve({ data: [] }),
    supabase
      .from('customers')
      .select('first_name, last_name, phone, email')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('patients')
      .select('name, species, breed, customers(first_name, last_name)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('appointments')
      .select('preferred_time, status, patients(name, species), customers(first_name, last_name)')
      .eq('organization_id', organizationId)
      .eq('appointment_date', today)
      .limit(15),
    branchId
      ? supabase
          .from('invoices')
          .select('invoice_number, status, total_amount, customers(first_name, last_name)')
          .eq('organization_id', organizationId)
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] }),
    supabase
      .from('organization_members')
      .select('role, user_profiles(first_name, last_name)')
      .eq('organization_id', organizationId)
      .eq('is_active', true),
    branchId
      ? supabase
          .from('products')
          .select('name, type, stock_quantity, selling_price')
          .eq('organization_id', organizationId)
          .eq('branch_id', branchId)
          .eq('is_active', true)
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
    lowStockItems: lowStock.slice(0, 10).map((p) => `${p.name} (${p.stock_quantity} left)`),
    customers: customersRes.data ?? [],
    pets: petsRes.data ?? [],
    todayAppointmentList: apptListRes.data ?? [],
    invoices: invoicesRes.data ?? [],
    staff: staffRes.data ?? [],
    products: productsRes.data ?? [],
  };
}

function extractSearchTerm(message: string): string | null {
  const patterns = [
    /who is\s+(.+?)\??$/i,
    /tell me about\s+(.+?)\??$/i,
    /find\s+(.+?)\??$/i,
    /about\s+(.+?)\??$/i,
  ];
  for (const p of patterns) {
    const m = message.match(p);
    if (m?.[1]) return m[1].trim().slice(0, 80);
  }
  return null;
}

function buildContextBlock(snapshot: Awaited<ReturnType<typeof loadClinicContext>>, lastUserMessage: string) {
  const lines: string[] = [
    `Today's snapshot:`,
    `- Appointments today: ${snapshot.todayAppointments}`,
    `- Walk-ins in queue: ${snapshot.activeWalkIns}`,
    `- Low stock: ${snapshot.lowStockItems.length ? snapshot.lowStockItems.join('; ') : 'none'}`,
    '',
    `Customers (${snapshot.customers.length} recent):`,
    ...snapshot.customers.map((c: { first_name: string; last_name: string; phone: string | null }) =>
      `- ${c.first_name} ${c.last_name}${c.phone ? ` (${c.phone})` : ''}`
    ),
    '',
    `Pets (${snapshot.pets.length} recent):`,
    ...snapshot.pets.map((p: { name: string; species: string; customers: { first_name: string; last_name: string } | null }) => {
      const owner = p.customers ? `${p.customers.first_name} ${p.customers.last_name}` : 'unknown owner';
      return `- ${p.name} (${p.species}) — owner: ${owner}`;
    }),
    '',
    `Staff:`,
    ...snapshot.staff.map((s: { role: string; user_profiles: { first_name: string; last_name: string } | null }) => {
      const prof = s.user_profiles;
      return `- ${prof ? `${prof.first_name} ${prof.last_name}` : 'Unknown'} (${s.role})`;
    }),
    '',
    `Today's appointments:`,
    ...(snapshot.todayAppointmentList as Array<{
      preferred_time: string | null;
      status: string;
      patients: { name: string } | null;
      customers: { first_name: string; last_name: string } | null;
    }>).map((a) =>
      `- ${a.preferred_time || 'TBD'}: ${a.patients?.name || 'pet'} / ${a.customers ? `${a.customers.first_name} ${a.customers.last_name}` : 'owner'} (${a.status})`
    ),
    '',
    `Recent invoices:`,
    ...(snapshot.invoices as Array<{
      invoice_number: string;
      status: string;
      total_amount: number;
      customers: { first_name: string; last_name: string } | null;
    }>).map((i) =>
      `- #${i.invoice_number} ${i.status} $${i.total_amount} — ${i.customers ? `${i.customers.first_name} ${i.customers.last_name}` : 'walk-in'}`
    ),
    '',
    `Inventory catalog (sample):`,
    ...(snapshot.products as Array<{ name: string; type: string; stock_quantity: number; selling_price: number }>).map(
      (p) => `- ${p.name} (${p.type}) qty ${p.stock_quantity} @ $${p.selling_price}`
    ),
  ];

  const term = extractSearchTerm(lastUserMessage);
  if (term) {
    const t = term.toLowerCase();
    const customerHits = snapshot.customers.filter(
      (c: { first_name: string; last_name: string }) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(t) ||
        c.first_name.toLowerCase().includes(t) ||
        c.last_name.toLowerCase().includes(t)
    );
    const petHits = snapshot.pets.filter((p: { name: string }) => p.name.toLowerCase().includes(t));
    const staffHits = snapshot.staff.filter((s: { user_profiles: { first_name: string; last_name: string } | null }) => {
      const prof = s.user_profiles;
      if (!prof) return false;
      return `${prof.first_name} ${prof.last_name}`.toLowerCase().includes(t);
    });
    lines.push('', `Search results for "${term}":`);
    customerHits.forEach((c: { first_name: string; last_name: string; phone: string | null; email: string | null }) => {
      lines.push(`- Customer: ${c.first_name} ${c.last_name}${c.phone ? `, ${c.phone}` : ''}${c.email ? `, ${c.email}` : ''}`);
    });
    petHits.forEach((p: { name: string; species: string; customers: { first_name: string; last_name: string } | null }) => {
      const owner = p.customers ? `${p.customers.first_name} ${p.customers.last_name}` : '';
      lines.push(`- Pet: ${p.name} (${p.species})${owner ? `, owner ${owner}` : ''}`);
    });
    staffHits.forEach((s: { role: string; user_profiles: { first_name: string; last_name: string } | null }) => {
      const prof = s.user_profiles!;
      lines.push(`- Staff: ${prof.first_name} ${prof.last_name} (${s.role})`);
    });
    if (!customerHits.length && !petHits.length && !staffHits.length) {
      lines.push('- No matching records in loaded clinic data.');
    }
  }

  return lines.join('\n');
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
    const lastUser = [...parsed.messages].reverse().find((m) => m.role === 'user');
    const contextBlock = buildContextBlock(snapshot, lastUser?.content ?? '');

    const messages: ChatMessage[] = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\n--- CLINIC DATA ---\n${contextBlock}` },
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
