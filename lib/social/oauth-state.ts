import { createHmac, timingSafeEqual } from 'crypto';

export type MetaOAuthState = {
  organizationId: string;
  branchId: string;
  userId: string;
  platform: 'facebook' | 'instagram';
  ts: number;
};

const MAX_AGE_MS = 10 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || process.env.META_APP_SECRET;
  if (!secret) throw new Error('OAuth state secret not configured');
  return secret;
}

export function encodeOAuthState(state: Omit<MetaOAuthState, 'ts'>): string {
  const payload: MetaOAuthState = { ...state, ts: Date.now() };
  const json = JSON.stringify(payload);
  const sig = createHmac('sha256', getSecret()).update(json).digest('base64url');
  const body = Buffer.from(json).toString('base64url');
  return `${body}.${sig}`;
}

export function decodeOAuthState(token: string): MetaOAuthState | null {
  try {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const json = Buffer.from(body, 'base64url').toString('utf8');
    const expected = createHmac('sha256', getSecret()).update(json).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(json) as MetaOAuthState;
    if (Date.now() - parsed.ts > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}
