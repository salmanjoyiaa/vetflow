const GRAPH = 'https://graph.facebook.com/v21.0';

const SCOPES = [
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
].join(',');

export function isMetaConfigured(): boolean {
  const key = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  return Boolean(
    process.env.META_APP_ID &&
      process.env.META_APP_SECRET &&
      key &&
      key.length >= 16
  );
}

export function getMetaRedirectUri(origin?: string): string {
  return (
    process.env.META_REDIRECT_URI ||
    `${origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/social/meta/callback`
  );
}

export function buildOAuthUrl(state: string, origin?: string): string {
  const appId = process.env.META_APP_ID!;
  const redirectUri = encodeURIComponent(getMetaRedirectUri(origin));
  return (
    `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}` +
    `&redirect_uri=${redirectUri}&state=${encodeURIComponent(state)}` +
    `&scope=${encodeURIComponent(SCOPES)}&response_type=code`
  );
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${GRAPH}${path}?${qs}`);
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Meta API error ${res.status}`);
  }
  return json as T;
}

async function graphPost<T>(path: string, params: Record<string, string>): Promise<T> {
  const body = new URLSearchParams(params);
  const res = await fetch(`${GRAPH}${path}`, { method: 'POST', body });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Meta API error ${res.status}`);
  }
  return json as T;
}

export async function exchangeCodeForUserToken(code: string, origin?: string): Promise<string> {
  const data = await graphGet<{ access_token: string }>('/oauth/access_token', {
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: getMetaRedirectUri(origin),
    code,
  });
  return data.access_token;
}

export async function exchangeForLongLivedUserToken(shortToken: string): Promise<{
  access_token: string;
  expires_in?: number;
}> {
  return graphGet('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortToken,
  });
}

export type MetaPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
};

export async function fetchPages(userToken: string): Promise<MetaPage[]> {
  const data = await graphGet<{
    data: Array<{
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: { id: string };
    }>;
  }>('/me/accounts', {
    access_token: userToken,
    fields: 'id,name,access_token,instagram_business_account',
  });

  const pages: MetaPage[] = [];
  for (const p of data.data || []) {
    let igUsername: string | undefined;
    if (p.instagram_business_account?.id) {
      try {
        const ig = await graphGet<{ username?: string }>(`/${p.instagram_business_account.id}`, {
          access_token: p.access_token,
          fields: 'username',
        });
        igUsername = ig.username;
      } catch {
        /* IG profile optional */
      }
    }
    pages.push({
      id: p.id,
      name: p.name,
      access_token: p.access_token,
      instagram_business_account: p.instagram_business_account
        ? { id: p.instagram_business_account.id, username: igUsername }
        : undefined,
    });
  }
  return pages;
}

export async function publishFacebookPost(
  pageId: string,
  pageToken: string,
  opts: { message: string; imageUrl?: string }
): Promise<string> {
  const params: Record<string, string> = {
    access_token: pageToken,
    message: opts.message,
  };
  if (opts.imageUrl) {
    params.url = opts.imageUrl;
    const data = await graphPost<{ id: string }>(`/${pageId}/photos`, params);
    return data.id;
  }
  const data = await graphPost<{ id: string }>(`/${pageId}/feed`, params);
  return data.id;
}

export async function publishInstagramPost(
  igAccountId: string,
  pageToken: string,
  opts: { caption: string; imageUrl: string }
): Promise<string> {
  const container = await graphPost<{ id: string }>(`/${igAccountId}/media`, {
    access_token: pageToken,
    image_url: opts.imageUrl,
    caption: opts.caption,
  });
  const published = await graphPost<{ id: string }>(`/${igAccountId}/media_publish`, {
    access_token: pageToken,
    creation_id: container.id,
  });
  return published.id;
}
