/**
 * Server-side endpoint for listing a user's files.
 */
import { error, json } from '@sveltejs/kit';
import { getR2Bucket } from '$lib/r2';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!platform) {
		// Development mode: no R2 available
		console.log(`[Pull-Dev] DEV MODE. Returning empty patch and LMI 0.`);
		throw error(500, 'R2 not available in development mode');
	}
	const bucket = getR2Bucket(platform);
	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		// Unauthenticated: no data
		console.log(`[Pull] Unauthenticated access attempt. Returning empty patch and LMI 0.`);
		throw error(401, 'Unauthorized');
	}

	// Authenticated user: fetch data from R2, compute patch, and new cookie fingerprint.
	try {
		// Only fetch and create patch if the version changed
		// Sanitize userId for safe inclusion in R2 object keys: only alphanumeric and underscore.
		const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_');

		// List all 'star' flags for this user from R2.
		const stars = await bucket.list({ prefix: `stars/${safeId}/` });

		return json(stars.objects.map((item) => item.key.replace('stars/', '')));
	} catch (err: any) {
		// Explicitly type err
		console.error(`[Pull] Error processing list:`, err.message, err);
		// Even in case of error generating patch, try to send the LMI
		throw error(500, `Failed to process pull: ${err.message}`);
	}
};
