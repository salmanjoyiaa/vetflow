import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import PageHeader from '@/components/ui/premium/PageHeader';
import RetailSaleClient from '@/components/sales/RetailSaleClient';
import { ShoppingBag } from 'lucide-react';

export const metadata = {
  title: 'Retail Sale',
  description: 'Counter sales for products and services without a visit.',
};

export default async function NewRetailSalePage() {
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/sales/new');
  if (denied) return denied;

  const cookieStore = await cookies();
  let activeBranchId = cookieStore.get('clinix_branch_id')?.value;
  if (!activeBranchId && ctx.branches.length > 0) activeBranchId = ctx.branches[0].id;
  else if (activeBranchId && !ctx.branches.some((b) => b.id === activeBranchId)) {
    activeBranchId = ctx.branches[0]?.id;
  }

  if (!activeBranchId) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs p-6 rounded-2xl">
        You must be assigned to a clinic branch to process retail sales.
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: productsData }, { data: servicesData }, { data: taxSetting }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, type, selling_price, stock_quantity')
      .eq('organization_id', ctx.organizationId!)
      .eq('branch_id', activeBranchId)
      .eq('is_active', true)
      .in('type', ['medicine', 'food', 'treats', 'accessory'])
      .order('name'),
    supabase
      .from('services')
      .select('id, name, price')
      .eq('organization_id', ctx.organizationId!)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('tax_settings')
      .select('is_enabled, tax_name, tax_percentage, applies_to_products, applies_to_services')
      .eq('organization_id', ctx.organizationId!)
      .maybeSingle(),
  ]);

  const products = (productsData || []).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type as string,
    sellingPrice: Number(p.selling_price),
    stockQuantity: Number(p.stock_quantity),
  }));

  const services = (servicesData || []).map((s) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price),
  }));

  const taxEnabled = taxSetting?.is_enabled || false;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Retail Sale"
        description="Sell products and services at the counter — no visit required. Payment is collected immediately."
        icon={ShoppingBag}
      />
      <RetailSaleClient
        activeBranchId={activeBranchId}
        products={products}
        services={services}
        taxPercentage={taxEnabled ? Number(taxSetting?.tax_percentage || 0) : 0}
        taxName={(taxSetting?.tax_name as string) || 'Tax'}
        appliesToProducts={Boolean(taxSetting?.applies_to_products)}
        appliesToServices={Boolean(taxSetting?.applies_to_services)}
      />
    </div>
  );
}
