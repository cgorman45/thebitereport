export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { withCache } from '@/lib/cache';

/**
 * GET /api/instagram/feed
 *
 * Fetches recent Instagram posts from the SD fishing landing accounts
 * using the Instagram Graph API Business Discovery endpoint.
 *
 * Business Discovery lets us read public media from any Business/Creator
 * account by username — no relationship or permission from the target
 * account is required.
 *
 * Requires env vars:
 *   INSTAGRAM_ACCESS_TOKEN        — long-lived Graph API token
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID — YOUR IG Business Account numeric ID
 *
 * If not configured, returns { posts: [], configured: false }.
 */

const GRAPH_API = 'https://graph.facebook.com/v21.0';

// Landing Instagram accounts to pull photos from.
// `limit` controls how many recent posts we grab per account.
const LANDING_ACCOUNTS = [
  { handle: 'seaforthlanding', name: 'Seaforth', limit: 4 },
  { handle: 'fishermans_landing', name: "Fisherman's", limit: 3 },
  { handle: 'hmlanding', name: 'H&M', limit: 2 },
  { handle: 'pointlomasportfishing', name: 'Pt. Loma', limit: 3 },
];

interface FeedPost {
  id: string;
  imageUrl: string;
  permalink: string;
  caption: string;
  timestamp: string;
  landing: string;
  mediaType: string;
}

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!token || !accountId) {
    return Response.json({ posts: [], configured: false });
  }

  try {
    const posts = await withCache('instagram-feed', 3600, () =>
      fetchLandingPosts(token, accountId),
    );
    return Response.json({ posts, configured: true });
  } catch (err) {
    console.error('[Instagram] Feed error:', err);
    return Response.json({ posts: [], configured: true, error: 'fetch_failed' });
  }
}

/**
 * For each landing account, use Business Discovery to grab their latest posts.
 *
 * Endpoint:
 *   GET /{your-ig-user-id}?fields=business_discovery.username({target}){
 *     media.limit(N){id,media_type,media_url,thumbnail_url,permalink,caption,timestamp}
 *   }&access_token={token}
 */
async function fetchLandingPosts(
  token: string,
  accountId: string,
): Promise<FeedPost[]> {
  const allPosts: FeedPost[] = [];

  for (const account of LANDING_ACCOUNTS) {
    try {
      const fields = [
        'id',
        'media_type',
        'media_url',
        'thumbnail_url',
        'permalink',
        'caption',
        'timestamp',
      ].join(',');

      const url =
        `${GRAPH_API}/${accountId}` +
        `?fields=business_discovery.username(${account.handle})` +
        `{media.limit(${account.limit}){${fields}}}` +
        `&access_token=${token}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(
          `[Instagram] Business Discovery failed for @${account.handle}: ${res.status}`,
          body.slice(0, 200),
        );
        continue;
      }

      const data = await res.json();
      const media = data?.business_discovery?.media?.data;
      if (!Array.isArray(media)) continue;

      for (const item of media) {
        const imageUrl =
          item.media_type === 'VIDEO'
            ? item.thumbnail_url ?? null
            : item.media_url ?? null;

        if (!imageUrl) continue;

        allPosts.push({
          id: item.id,
          imageUrl,
          permalink: item.permalink,
          caption: item.caption ?? '',
          timestamp: item.timestamp,
          landing: account.name,
          mediaType: item.media_type,
        });
      }
    } catch (err) {
      console.error(
        `[Instagram] Error fetching @${account.handle}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Most recent first
  return allPosts.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
