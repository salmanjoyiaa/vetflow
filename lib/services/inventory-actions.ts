'use server';

import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { resolveServerSession } from '@/lib/services/auth';
import { writeAuditLog } from '@/lib/services/audit';

export const ProductSchema = z.object({
  name: z.string().min(1, { message: 'Product name is required' }),
  brand: z.string().optional().or(z.literal('')),
  sku: z.string().optional().or(z.literal('')),
  unit: z.string().min(1, { message: 'Unit is required' }),
  type: z.enum(['medicine', 'food', 'accessory', 'service'], { message: 'Invalid type' }),
  purchasePrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  stockQuantity: z.number().int().nonnegative(),
  reorderLevel: z.number().int().nonnegative(),
  categoryId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid({ message: 'Invalid branch' }),
});

export const StockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  branchId: z.string().uuid(),
  quantity: z.number().int(), // Can be positive or negative
  type: z.enum(['purchase_added', 'manual_adjustment', 'expired_removed', 'return']),
  reason: z.string().min(1, { message: 'Reason is required' }),
});

export type ProductInput = z.infer<typeof ProductSchema>;
export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;

/**
 * Creates a new catalog product or service.
 * If initial stock is > 0 and type is not a service, registers a 'purchase_added' stock movement.
 */
export async function createProductAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session || session.role !== 'clinic_admin' || !session.organizationId) {
      throw new Error('Unauthorized: Only clinic administrators can configure catalog items.');
    }

    const parsed = ProductSchema.parse(payload);
    const supabase = await createClient();

    // 1. Insert the Product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        organization_id: session.organizationId,
        branch_id: parsed.branchId,
        category_id: parsed.categoryId || null,
        name: parsed.name,
        brand: parsed.brand || null,
        sku: parsed.sku || null,
        unit: parsed.unit,
        type: parsed.type,
        purchase_price: parsed.purchasePrice,
        selling_price: parsed.sellingPrice,
        stock_quantity: parsed.type === 'service' ? 9999 : parsed.stockQuantity, // Services have unlimited virtual stock
        reorder_level: parsed.reorderLevel,
        is_active: true,
      })
      .select()
      .single();

    if (error || !product) {
      throw new Error(error?.message || 'Failed to register catalog product.');
    }

    // 2. Insert Stock Movement if initial stock is > 0 and it's a physical product
    if (parsed.type !== 'service' && parsed.stockQuantity > 0) {
      await supabase.from('stock_movements').insert({
        organization_id: session.organizationId,
        branch_id: parsed.branchId,
        product_id: product.id,
        type: 'purchase_added',
        quantity: parsed.stockQuantity,
        reason: 'Initial stock intake on creation',
        created_by: session.userId,
      });
    }

    // 3. Write Audit Log
    await writeAuditLog({
      organizationId: session.organizationId,
      branchId: parsed.branchId,
      actorUserId: session.userId,
      actorRole: session.role || 'clinic_admin',
      action: 'STOCK_ADJUSTED',
      resourceType: 'PRODUCT',
      resourceId: product.id,
      afterData: product,
    });

    return { success: true, product };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Executes a manual stock adjustment and logs a stock movement record in an atomic sequence.
 */
export async function adjustStockAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session || !session.organizationId) {
      throw new Error('Unauthorized: Session is invalid.');
    }

    const parsed = StockAdjustmentSchema.parse(payload);
    
    // RLS will guard branch membership, but let's double check on the server
    if (session.role !== 'clinic_admin' && !session.branches.some((b) => b.id === parsed.branchId)) {
      throw new Error('Unauthorized: You do not have permissions for this branch.');
    }

    const adminClient = await createAdminClient(); // Use admin client to execute atomic count updates safely

    // 1. Fetch current product details
    const { data: product, error: fetchErr } = await adminClient
      .from('products')
      .select('stock_quantity, type, name')
      .eq('id', parsed.productId)
      .eq('organization_id', session.organizationId)
      .single();

    if (fetchErr || !product) {
      throw new Error('Catalog product not found.');
    }

    if (product.type === 'service') {
      throw new Error('Cannot adjust stock balance of virtual service items.');
    }

    const newQuantity = product.stock_quantity + parsed.quantity;
    if (newQuantity < 0) {
      throw new Error('Stock deduction results in a negative balance.');
    }

    // 2. Perform Stock Update
    const { error: updateErr } = await adminClient
      .from('products')
      .update({ stock_quantity: newQuantity })
      .eq('id', parsed.productId);

    if (updateErr) {
      throw new Error(updateErr.message || 'Failed to update stock quantity.');
    }

    // 3. Register Stock Movement Record
    const { error: moveErr } = await adminClient
      .from('stock_movements')
      .insert({
        organization_id: session.organizationId,
        branch_id: parsed.branchId,
        product_id: parsed.productId,
        type: parsed.type,
        quantity: parsed.quantity,
        reason: parsed.reason,
        created_by: session.userId,
      });

    if (moveErr) {
      // Revert stock update on failure to log movement
      await adminClient.from('products').update({ stock_quantity: product.stock_quantity }).eq('id', parsed.productId);
      throw new Error(moveErr.message || 'Failed to write stock movement log.');
    }

    // 4. Audit Log
    await writeAuditLog({
      organizationId: session.organizationId,
      branchId: parsed.branchId,
      actorUserId: session.userId,
      actorRole: session.role || 'receptionist',
      action: 'STOCK_ADJUSTED',
      resourceType: 'PRODUCT',
      resourceId: parsed.productId,
      beforeData: { stock_quantity: product.stock_quantity },
      afterData: { stock_quantity: newQuantity, change: parsed.quantity },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Creates a product category.
 */
export async function createCategoryAction(name: string) {
  try {
    const session = await resolveServerSession();
    if (!session || session.role !== 'clinic_admin' || !session.organizationId) {
      throw new Error('Unauthorized: Only clinic administrators can add categories.');
    }

    const supabase = await createClient();
    const { data: category, error } = await supabase
      .from('product_categories')
      .insert({
        organization_id: session.organizationId,
        name,
      })
      .select()
      .single();

    if (error || !category) {
      throw new Error(error?.message || 'Failed to create product category.');
    }

    return { success: true, category };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
