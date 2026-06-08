'use server';

import { resolveServerAuthContext, assertCapability, assertFeature, assertOrganization } from '@/lib/auth/context';

export type StockInvoiceDraftLine = {
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
};

export type StockInvoiceDraft = {
  supplierName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  lineItems: StockInvoiceDraftLine[];
};

const EXTRACTION_PROMPT = `Extract supplier invoice data from this image. Return ONLY valid JSON with this shape:
{
  "supplierName": "string or null",
  "invoiceNumber": "string or null",
  "invoiceDate": "YYYY-MM-DD or null",
  "lineItems": [
    { "name": "product name", "sku": "optional", "quantity": number, "unitPrice": number, "unit": "optional e.g. pcs, box" }
  ]
}
Use numbers for quantity and unitPrice. If unclear, omit the field or use best estimate. No markdown.`;

export async function parseStockInvoiceImageAction(formData: FormData): Promise<{
  success: boolean;
  draft?: StockInvoiceDraft;
  warnings?: string[];
  error?: string;
}> {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_inventory');
    assertFeature(ctx, 'inventory');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error:
          'OPENAI_API_KEY is not configured. Add it to your environment to enable invoice scanning.',
      };
    }

    const file = formData.get('image') as File | null;
    if (!file || file.size === 0) {
      throw new Error('No image file provided.');
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      throw new Error('Supported formats: JPG, PNG, WebP, or PDF.');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mime = file.type === 'application/pdf' ? 'image/jpeg' : file.type;
    const dataUrl = `data:${mime};base64,${base64}`;

    const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: EXTRACTION_PROMPT },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Vision API error: ${response.status} ${errText.slice(0, 200)}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content as string | undefined;
    if (!content) {
      throw new Error('No extraction result from vision API.');
    }

    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned) as {
      supplierName?: string | null;
      invoiceNumber?: string | null;
      invoiceDate?: string | null;
      lineItems?: Array<{
        name?: string;
        sku?: string;
        quantity?: number;
        unitPrice?: number;
        unit?: string;
      }>;
    };

    const warnings: string[] = [];
    const lineItems: StockInvoiceDraftLine[] = [];

    for (const row of parsed.lineItems || []) {
      if (!row.name) continue;
      const qty = Number(row.quantity) || 0;
      const price = Number(row.unitPrice) || 0;
      if (qty <= 0) warnings.push(`Skipped "${row.name}" — invalid quantity`);
      else {
        lineItems.push({
          name: row.name,
          sku: row.sku || undefined,
          quantity: Math.round(qty),
          unitPrice: price,
          unit: row.unit || undefined,
        });
      }
    }

    if (lineItems.length === 0) {
      warnings.push('No line items could be extracted. Enter manually.');
    }

    return {
      success: true,
      draft: {
        supplierName: parsed.supplierName || undefined,
        invoiceNumber: parsed.invoiceNumber || undefined,
        invoiceDate: parsed.invoiceDate || undefined,
        lineItems,
      },
      warnings,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to parse invoice image.',
    };
  }
}
