'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  lookupCustomerByPhoneAction,
  type CustomerSearchResult,
} from '@/lib/services/customer-actions';
import { createRetailSaleAction } from '@/lib/services/retail-sale-actions';
import { looksLikePhone } from '@/lib/reception/phone';
import Select from '@/components/ui/premium/Select';
import { useCurrency } from '@/lib/context/CurrencyContext';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Loader2,
  Phone,
  User,
  CheckCircle,
  Printer,
  Search,
} from 'lucide-react';

export type RetailProductOption = {
  id: string;
  name: string;
  type: string;
  sellingPrice: number;
  stockQuantity: number;
};

export type RetailServiceOption = {
  id: string;
  name: string;
  price: number;
};

type CartLine = {
  key: string;
  lineType: 'product' | 'service';
  productId?: string | null;
  serviceId?: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
};

interface RetailSaleClientProps {
  activeBranchId: string;
  products: RetailProductOption[];
  services: RetailServiceOption[];
  taxPercentage: number;
  taxName: string;
  appliesToProducts: boolean;
  appliesToServices: boolean;
}

export default function RetailSaleClient({
  activeBranchId,
  products,
  services,
  taxPercentage,
  taxName,
  appliesToProducts,
  appliesToServices,
}: RetailSaleClientProps) {
  const { formatCurrency } = useCurrency();
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [lookupLoading, setLookupLoading] = useState(false);
  const [matchedCustomer, setMatchedCustomer] = useState<CustomerSearchResult | null>(null);

  const [addType, setAddType] = useState<'product' | 'service'>('product');
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [sendEmailReceipt, setSendEmailReceipt] = useState(false);
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState<{
    invoiceId: string;
    invoiceNumber: string;
    total: number;
  } | null>(null);

  const runPhoneLookup = useCallback(async (val: string) => {
    if (!looksLikePhone(val) || val.trim().length < 7) {
      setMatchedCustomer(null);
      return;
    }
    setLookupLoading(true);
    const res = await lookupCustomerByPhoneAction(val);
    setLookupLoading(false);
    if (res.success && res.customer) {
      setMatchedCustomer(res.customer);
      setCustomerId(res.customer.id);
      setFirstName(res.customer.firstName);
      setLastName(res.customer.lastName);
      setEmail(res.customer.email || '');
    } else {
      setMatchedCustomer(null);
      setCustomerId(undefined);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (phone.trim().length >= 7) void runPhoneLookup(phone);
    }, 400);
    return () => clearTimeout(t);
  }, [phone, runPhoneLookup]);

  const addToCart = () => {
    if (!selectedCatalogId) return;
    if (addType === 'product') {
      const p = products.find((x) => x.id === selectedCatalogId);
      if (!p) return;
      setCart((prev) => [
        ...prev,
        {
          key: `p-${p.id}-${Date.now()}`,
          lineType: 'product',
          productId: p.id,
          name: p.name,
          quantity: 1,
          unitPrice: p.sellingPrice,
        },
      ]);
    } else {
      const s = services.find((x) => x.id === selectedCatalogId);
      if (!s) return;
      setCart((prev) => [
        ...prev,
        {
          key: `s-${s.id}-${Date.now()}`,
          lineType: 'service',
          serviceId: s.id,
          name: s.name,
          quantity: 1,
          unitPrice: s.price,
        },
      ]);
    }
    setSelectedCatalogId('');
  };

  const updateQty = (key: string, qty: number) => {
    if (qty < 1) return;
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: qty } : l)));
  };

  const removeLine = (key: string) => {
    setCart((prev) => prev.filter((l) => l.key !== key));
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    for (const line of cart) {
      const lineSub = line.quantity * line.unitPrice;
      subtotal += lineSub;
      let applies = false;
      if (taxPercentage > 0) {
        if (line.lineType === 'service' && appliesToServices) applies = true;
        if (line.lineType === 'product' && appliesToProducts) applies = true;
      }
      if (applies) taxTotal += lineSub * (taxPercentage / 100);
    }
    const total = Math.max(0, subtotal + taxTotal - discount);
    return { subtotal, taxTotal, total };
  }, [cart, discount, taxPercentage, appliesToProducts, appliesToServices]);

  const handleSubmit = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError('Customer name and phone are required.');
      return;
    }
    if (cart.length === 0) {
      setError('Add at least one product or service.');
      return;
    }

    setIsSubmitting(true);
    const res = await createRetailSaleAction({
      branchId: activeBranchId,
      customerId,
      customerFirstName: firstName.trim(),
      customerLastName: lastName.trim(),
      customerPhone: phone.trim(),
      customerEmail: email.trim() || undefined,
      lineItems: cart.map((l) => ({
        productId: l.productId ?? null,
        serviceId: l.serviceId ?? null,
        name: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineType: l.lineType,
      })),
      discount,
      paymentMethod,
      paymentReference,
      notes,
      sendEmailReceipt,
    });
    setIsSubmitting(false);

    if (res.success) {
      setCompleted({
        invoiceId: res.invoiceId,
        invoiceNumber: res.invoiceNumber,
        total: res.total,
      });
    } else {
      setError(res.error || 'Sale failed');
    }
  };

  const resetSale = () => {
    setCart([]);
    setPhone('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setCustomerId(undefined);
    setMatchedCustomer(null);
    setDiscount(0);
    setPaymentReference('');
    setNotes('');
    setCompleted(null);
    setError(null);
  };

  if (completed) {
    return (
      <div className="glass-panel rounded-2xl border border-emerald-500/30 p-8 text-center space-y-4 max-w-lg mx-auto">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
        <h3 className="text-lg font-bold text-on-surface">Sale completed</h3>
        <p className="text-sm text-on-surface-variant">
          Invoice <span className="font-mono font-bold">{completed.invoiceNumber}</span>
          {' — '}
          {formatCurrency(completed.total)}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={`/api/invoices/${completed.invoiceId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
          >
            <Printer className="w-4 h-4" />
            Print receipt
          </a>
          <Link
            href={`/dashboard/invoices/${completed.invoiceId}`}
            className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold"
          >
            View invoice
          </Link>
          <button
            type="button"
            onClick={resetSale}
            className="px-4 py-2 rounded-xl border border-primary text-primary text-xs font-bold"
          >
            New sale
          </button>
        </div>
      </div>
    );
  }

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name} — ${formatCurrency(p.sellingPrice)} (stock: ${p.stockQuantity})`,
  }));

  const serviceOptions = services.map((s) => ({
    value: s.id,
    label: `${s.name} — ${formatCurrency(s.price)}`,
  }));

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-4">
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5 space-y-4">
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Customer
          </h3>
          <div>
            <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Phone</label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Owner phone number"
                className="w-full pl-9 pr-3 py-2.5 bg-surface-container/20 border border-outline-variant rounded-xl text-sm"
              />
              {lookupLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
              )}
            </div>
          </div>
          {matchedCustomer && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700">
              Existing customer: {matchedCustomer.firstName} {matchedCustomer.lastName}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-on-surface-variant uppercase">First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-surface-container/20 border border-outline-variant rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-surface-container/20 border border-outline-variant rounded-xl text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container/20 border border-outline-variant rounded-xl text-sm"
            />
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5 space-y-3">
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Add to cart
          </h3>
          <div className="flex gap-2">
            {(['product', 'service'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setAddType(t);
                  setSelectedCatalogId('');
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize ${
                  addType === t ? 'bg-primary text-white' : 'border border-outline-variant'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Select
            value={selectedCatalogId}
            onChange={setSelectedCatalogId}
            options={[
              { value: '', label: addType === 'product' ? '— Select product —' : '— Select service —' },
              ...(addType === 'product' ? productOptions : serviceOptions),
            ]}
            placeholder="Search catalog…"
          />
          <button
            type="button"
            onClick={addToCart}
            disabled={!selectedCatalogId}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add item
          </button>
        </div>
      </div>

      <div className="lg:col-span-7 space-y-4">
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5 space-y-4">
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            Cart ({cart.length})
          </h3>
          {cart.length === 0 ? (
            <p className="text-xs text-on-surface-variant/60 italic text-center py-8">No items yet.</p>
          ) : (
            <div className="space-y-2">
              {cart.map((line) => (
                <div
                  key={line.key}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-container/20 border border-outline-variant/30"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-on-surface block truncate">{line.name}</span>
                    <span className="text-[10px] text-on-surface-variant capitalize">{line.lineType}</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => updateQty(line.key, parseInt(e.target.value, 10) || 1)}
                    className="w-14 px-2 py-1 text-xs border rounded-lg text-center"
                  />
                  <span className="text-xs font-bold w-20 text-right">
                    {formatCurrency(line.quantity * line.unitPrice)}
                  </span>
                  <button type="button" onClick={() => removeLine(line.key)} className="text-destructive p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-outline-variant/30 pt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {taxPercentage > 0 && (
              <div className="flex justify-between text-on-surface-variant">
                <span>{taxName || 'Tax'} ({taxPercentage}%)</span>
                <span>{formatCurrency(totals.taxTotal)}</span>
              </div>
            )}
            <div className="flex justify-between items-center gap-2">
              <span>Discount</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 border rounded-lg text-right"
              />
            </div>
            <div className="flex justify-between text-sm font-bold pt-2">
              <span>Total due</span>
              <span className="text-primary">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5 space-y-3">
          <h3 className="text-sm font-bold text-on-surface">Payment</h3>
          <div className="flex flex-wrap gap-2">
            {(['cash', 'card', 'bank_transfer'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${
                  paymentMethod === m ? 'bg-primary text-white' : 'border border-outline-variant'
                }`}
              >
                {m.replace('_', ' ')}
              </button>
            ))}
          </div>
          <input
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="Payment reference (optional)"
            className="w-full px-3 py-2 bg-surface-container/20 border border-outline-variant rounded-xl text-xs"
          />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={sendEmailReceipt}
              onChange={(e) => setSendEmailReceipt(e.target.checked)}
            />
            Email receipt to customer
          </label>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || cart.length === 0}
          className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {isSubmitting ? 'Processing…' : 'Complete sale & print receipt'}
        </button>
      </div>
    </div>
  );
}
