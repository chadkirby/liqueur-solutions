import type { RequestEvent } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';

import { getR2Bucket } from '$lib/r2';

/**
 * POST /api/tinybase/save
 * Saves the entire TinyBase store (Tables+Values) as JSON to R2.
 */
export async function POST({ platform, locals, request }: RequestEvent) {
  if (!platform) {
    // Dev mode: no-op
    return json({ ok: true });
  }
  const bucket = getR2Bucket(platform);
  const userId = locals.userId;
  if (!userId) {
    throw error(401, 'Unauthorized');
  }
  const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_');
  const key = `tinybase/${safeId}.json`;
  try {
    const body = await request.text();
    await bucket.put(key, body, {
      httpMetadata: { contentType: 'application/json' }
    });
    return json({ ok: true });
  } catch (e: any) {
    console.error('[TinyBase Save] Error saving key', key, e);
    throw error(500, 'Failed to save data');
  }
}