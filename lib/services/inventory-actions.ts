'use server';

import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  assertBranchAccess,
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { ProductSchema, StockAdjustmentSchema, type ProductInput, type StockAdjustmentInput } from '@/lib/validations/schemas';

export async function createProductAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_inventory');

    const parsed = ProductSchema.parse(payload);
    assertBranchAccess(ctx, parsed.branchId);

    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        organization_id: ctx.organizationId,
        branch_id: parsed.branchId,
        category_id: parsed.categoryId || null,
        name: parsed.name,
        brand: parsed.brand || null,
        sku: parsed.sku || null,
        unit: parsed.unit,
        type: parsed.type,
        purchase_price: parsed.purchasePrice,
        selling_price: parsed.sellingPrice,
        stock_quantity: parsed.type === 'service' ? 9999 : parsed.stockQuantity,
        reorder_level: parsed.reorderLevel,
        is_active: true,
      })
      .select()
      .single();

    if (error || !product) {
      throw new Error(error?.message || 'Failed to register catalog product.');
    }

    if (parsed.type !== 'service' && parsed.stockQuantity > 0) {
      await supabase.from('stock_movements').insert({
        organization_id: ctx.organizationId,
        branch_id: parsed.branchId,
        product_id: product.id,
        type: 'purchase_added',
        quantity: parsed.stockQuantity,
        reason: 'Initial stock intake on creation',
        created_by: ctx.userId,
      });
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: parsed.branchId,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'clinic_admin',
      action: 'STOCK_ADJUSTED',
      resourceType: 'PRODUCT',
      resourceId: product.id,
      afterData: product,
    });

    return { success: true, product };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

export async function adjustStockAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_inventory');

    const parsed = StockAdjustmentSchema.parse(payload);
    assertBranchAccess(ctx, parsed.branchId);

    const adminClient = await createAdminClient();

    const { data: product, error: fetchErr } = await adminClient
      .from('products')
      .select('stock_quantity, type, name')
      .eq('id', parsed.productId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (fetchErr || !product) {
      throw new Error('Product not found or access denied.');
    }

    if (product.type === 'service') {
      throw new Error('Cannot adjust stock on service items.');
    }

    const newQty = product.stock_quantity + parsed.quantity;
    if (newQty < 0) {
      throw new Error('Adjustment would result in negative stock.');
    }

    const { error: updateErr } = await adminClient
      .from('products')
      .update({ stock_quantity: newQty })
      .eq('id', parsed.productId);

    if (updateErr) {
      throw new Error(updateErr.message || 'Failed to update stock quantity.');
    }

    await adminClient.from('stock_movements').insert({
      organization_id: ctx.organizationId,
      branch_id: parsed.branchId,
      product_id: parsed.productId,
      type: parsed.type,
      quantity: parsed.quantity,
      reason: parsed.reason,
      created_by: ctx.userId,
    });

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: parsed.branchId,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'clinic_admin',
      action: 'STOCK_ADJUSTED',
      resourceType: 'PRODUCT',
      resourceId: parsed.productId,
      afterData: { newQty, adjustment: parsed.quantity },
    });

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

export async function toggleProductStatusAction(productId: string, isActive: boolean) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_inventory');

    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from('products')
      .update({ is_active: isActive })
      .eq('id', productId)
      .eq('organization_id', ctx.organizationId)
      .select('branch_id')
      .single();

    if (error || !product) {
      throw new Error(error?.message || 'Failed to update product status.');
    }

    assertBranchAccess(ctx, product.branch_id);

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}
