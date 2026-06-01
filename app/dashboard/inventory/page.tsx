import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveServerSession } from '@/lib/services/auth';
import { createClient } from '@/lib/supabase/server';
import ProductForm from '@/components/forms/ProductForm';
import StockAdjustmentForm from '@/components/forms/StockAdjustmentForm';
import { Layers, AlertCircle, ShoppingBag, ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'VetFlow Inventory Catalog',
  description: 'Manage clinic products, services, and branch stock levels.',
};

export default async function InventoryPage() {
  const session = await resolveServerSession();
  if (!session) {
    redirect('/login');
  }

  // 1. Resolve branch context
  const cookieStore = await cookies();
  const activeBranchCookie = cookieStore.get('vetflow_branch_id')?.value;
  let activeBranchId = activeBranchCookie;

  if (!activeBranchId && session.branches.length > 0) {
    activeBranchId = session.branches[0].id;
  } else if (activeBranchId && !session.branches.some((b) => b.id === activeBranchId)) {
    activeBranchId = session.branches[0]?.id;
  }

  if (!activeBranchId) {
    return (
      <div className="bg-amber-500/5 border border-amber-500/20 text-amber-700 text-xs p-6 rounded-2xl">
        You must be assigned to a clinic branch to open the inventory dashboard.
      </div>
    );
  }

  const supabase = await createClient();

  // 2. Fetch catalog products in branch
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      brand,
      sku,
      unit,
      type,
      purchase_price,
      selling_price,
      stock_quantity,
      reorder_level,
      category_id,
      product_categories ( name )
    `)
    .eq('branch_id', activeBranchId)
    .order('name', { ascending: true });

  if (error) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Failed to load catalog products: {error.message}
      </div>
    );
  }

  // 3. Fetch categories for ProductForm dropdown
  const { data: categories } = await supabase
    .from('product_categories')
    .select('id, name')
    .eq('organization_id', session.organizationId);

  // Compute stats
  const totalItems = products?.length || 0;
  const lowStockItems = products?.filter((p) => p.type !== 'service' && p.stock_quantity <= p.reorder_level) || [];

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-primary-navy tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-teal" />
            Inventory & Catalog
          </h2>
          <p className="text-xs text-graphite/70 mt-1">
            Configure medicines, foods, accessories, services, and check stock levels.
          </p>
        </div>

        {/* Product addition form (Admins only) */}
        {session.role === 'clinic_admin' && (
          <ProductForm 
            categories={categories || []} 
            branches={session.branches} 
            activeBranchId={activeBranchId} 
          />
        )}
      </div>

      {/* STATS MATRIX */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-border/40 p-4 shadow-premium">
          <span className="text-[10px] font-bold text-graphite/40 uppercase block">Total Catalog Items</span>
          <span className="text-lg font-black text-primary-navy mt-1 block">{totalItems}</span>
        </div>
        <div className="bg-white rounded-2xl border border-border/40 p-4 shadow-premium">
          <span className="text-[10px] font-bold text-destructive uppercase block flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Low Stock Alerts
          </span>
          <span className="text-lg font-black text-destructive mt-1 block">
            {lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* PRODUCT LIST TABLE */}
      {products && products.length > 0 ? (
        <div className="bg-white rounded-2xl border border-border/40 overflow-hidden shadow-premium">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary-ivory/40 border-b border-border/40 text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider">
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4">Type & Category</th>
                <th className="px-6 py-4">Pricing</th>
                <th className="px-6 py-4">Stock Balance</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-xs">
              {products.map((prod) => {
                const isLowStock = prod.type !== 'service' && prod.stock_quantity <= prod.reorder_level;
                return (
                  <tr key={prod.id} className="hover:bg-primary-ivory/10 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-primary-navy block">{prod.name}</span>
                      <span className="text-[10px] text-graphite/50 block">
                        {prod.brand && `Brand: ${prod.brand}`} {prod.sku && `• SKU: ${prod.sku}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 capitalize text-graphite/70">
                      <span className="font-semibold text-primary-navy">{prod.type}</span>
                      {prod.product_categories && (
                        <span className="text-graphite/60 block text-[10px]">
                          Category: {(prod.product_categories as any).name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 space-y-0.5 text-graphite/80 font-medium">
                      <div>Sell: ${Number(prod.selling_price).toFixed(2)}</div>
                      <div className="text-[10px] text-graphite/50">Buy: ${Number(prod.purchase_price).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4">
                      {prod.type === 'service' ? (
                        <span className="text-graphite/50 italic font-semibold">Virtual Service</span>
                      ) : (
                        <div className="space-y-1">
                          <span className={`font-bold ${isLowStock ? 'text-destructive' : 'text-primary-navy'}`}>
                            {prod.stock_quantity} {prod.unit || 'pcs'}
                          </span>
                          {isLowStock && (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-destructive bg-destructive/5 border border-destructive/20 px-2 py-0.5 rounded-lg w-max">
                              <ShieldAlert className="w-3 h-3" />
                              Low Stock (Limit {prod.reorder_level})
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {prod.type !== 'service' ? (
                        <StockAdjustmentForm
                          productId={prod.id}
                          productName={prod.name}
                          branchId={activeBranchId}
                          currentStock={prod.stock_quantity}
                        />
                      ) : (
                        <span className="text-[10px] text-graphite/40 italic">Billed Service</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border/40 p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-graphite/30 mx-auto mb-4" />
          <h4 className="text-sm font-bold text-primary-navy mb-1">Catalog is Empty</h4>
          <p className="text-xs text-graphite/60">
            Create products, medicines, or services to begin prescription and invoicing checkout.
          </p>
        </div>
      )}

    </div>
  );
}
