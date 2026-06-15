import { createClient } from '@/lib/supabase/server';

export type ForecastItem = {
  productId: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
  avgDailyUse: number;
  daysUntilStockout: number | null;
};

export async function getInventoryForecast(
  organizationId: string,
  branchId: string
): Promise<ForecastItem[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString();

  const { data: products } = await supabase
    .from('products')
    .select('id, name, stock_quantity, reorder_level')
    .eq('organization_id', organizationId)
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .neq('type', 'service');

  if (!products?.length) return [];

  const { data: movements } = await supabase
    .from('stock_movements')
    .select('product_id, quantity, type')
    .eq('branch_id', branchId)
    .gte('created_at', sinceStr);

  const usageByProduct = new Map<string, number>();
  for (const m of movements || []) {
    if (m.type === 'invoice_sale' || m.type === 'expired_removed') {
      const used = Math.abs(m.quantity);
      usageByProduct.set(m.product_id, (usageByProduct.get(m.product_id) || 0) + used);
    }
  }

  return products.map((p) => {
    const totalUsed = usageByProduct.get(p.id) || 0;
    const avgDaily = totalUsed / 30;
    const daysUntilStockout =
      avgDaily > 0 ? Math.floor(p.stock_quantity / avgDaily) : null;
    return {
      productId: p.id,
      name: p.name,
      currentStock: p.stock_quantity,
      reorderLevel: p.reorder_level,
      avgDailyUse: Math.round(avgDaily * 100) / 100,
      daysUntilStockout,
    };
  }).filter((f) => f.avgDailyUse > 0 || f.currentStock <= f.reorderLevel);
}
