import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

import { getR2Bucket } from '$lib/r2';

/**
 * GET /api/tinybase/load
 * Returns the entire TinyBase store (Tables+Values) as JSON.
 */
export async function GET({ platform, locals }: RequestEvent) {
  if (!platform) {
    // Dev mode: return empty store
    return new Response(JSON.stringify([{}, {}]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const bucket = getR2Bucket(platform);
  const userId = locals.userId;
  if (!userId) {
    // Unauthenticated: empty store
    return new Response(JSON.stringify([{}, {}]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_');
  const key = `tinybase/${safeId}.json`;
  try {
    const obj = await bucket.get(key);
    if (!obj) {
      return new Response(JSON.stringify([{}, {}]), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const text = await obj.text();
    return new Response(text, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[TinyBase Load] Error loading key', key, e);
    throw error(500, 'Failed to load data');
  }
}