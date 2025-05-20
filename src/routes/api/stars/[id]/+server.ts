/**
 * Server-side endpoint for manipulating stars.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getR2Bucket } from '$lib/r2';

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

	// Authenticated user: fetch data from R2, compute patch, and new cookie fingerprint.
	try {
		// Only fetch and create patch if the version changed
		// Sanitize userId for safe inclusion in R2 object keys: only alphanumeric and underscore.
		const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_');

		// get the requested file for this authenticated user from R2.
		const star = await bucket.get(`stars/${safeId}/${mixtureId}`);
		if (!star) {
			console.log(`[Pull] No star found for id: ${mixtureId}`);
			// return 404
			throw error(404, `Star not found for id: ${mixtureId}`);
		}
		return json({ ok: true });
	} catch (err: any) {
		// Explicitly type err
		console.error(`[Pull] Error processing list:`, err.message, err);
		// Even in case of error generating patch, try to send the LMI
		throw error(500, `Failed to process pull: ${err.message}`);
	}
};

// star the file with the given id
export const POST: RequestHandler = async ({ params, request, platform, locals }: RequestEvent) => {
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

	try {
		const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_');
		await bucket.put(`stars/${safeId}/${mixtureId}`, '1');
	} catch (err: any) {
		console.error(`[Push] Error processing POST star:`, err.message, err);
		throw error(500, `Failed to process POST star: ${err.message}`);
	}
	return json({ ok: true });
};

// delete the star with the given id
export const DELETE: RequestHandler = async ({ params, platform, locals }: RequestEvent) => {
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

	try {
		const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_');
		await bucket.delete(`stars/${safeId}/${mixtureId}`);
	} catch (err: any) {
		console.error(`[Push] Error processing push:`, err.message, err);
		throw error(500, `Failed to process push: ${err.message}`);
	}
	return json({ ok: true });
};
