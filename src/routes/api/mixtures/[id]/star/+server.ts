/**
 * Server-side endpoint for manipulating stars.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import { getR2Bucket } from '$lib/r2.js';
import type { R2ObjectBody } from '@cloudflare/workers-types';

export const GET: RequestHandler = async ({ params, platform, locals }: RequestEvent) => {
	const mixtureId = params.id;

	if (!mixtureId) {
		// Missing mixtureId: return 400
		throw error(400, 'Missing mixtureId');
	}

	if (!platform) {
		// Development mode: no R2 available, return empty patch
		throw error(500, 'R2 not available in development mode');
	}
	const bucket = getR2Bucket(platform);
	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		// Unauthenticated: no data
		throw error(401, 'Unauthorized');
	}
	// Sanitize userId for safe inclusion in R2 object keys: only alphanumeric and underscore.
	const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_');
	let star: R2ObjectBody | null = null;

	// Authenticated user: fetch data from R2, compute patch, and new cookie fingerprint.
	try {
		// get the requested file for this authenticated user from R2.
		star = await bucket.get(`files/${safeId}/${mixtureId}`);
	} catch (err: any) {
		// Explicitly type err
		console.error(`[Pull] Error processing list:`, err.message, err);
		// Even in case of error generating patch, try to send the LMI
		throw error(500, `Failed to process pull: ${err.message}`);
	}
	if (star) {
		return json({
			ok: true,
		});
	}
	// return 404
	throw error(404, `Star not found for id: ${mixtureId}`);
};
