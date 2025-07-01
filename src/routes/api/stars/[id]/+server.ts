/**
 * Server-side endpoint for listing a user's files.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getR2Bucket } from '$lib/r2';
import { rollbar } from '$lib/rollbar';

// update the file with the given id
export const PUT: RequestHandler = async ({ params, request, platform, locals }) => {
	const mixtureId = params.id;

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

	const safeId = userId.replace(/[^a-z0-9]/gi, '_');

	try {
		const obj = await bucket.put(`stars/${safeId}/${mixtureId}`, JSON.stringify(true));
		if (!obj) {
			rollbar.error(`[PUT] Failed to put item for id: ${mixtureId}`);
			throw error(500, `Failed to put item for id: ${mixtureId}`);
		}
		rollbar.log(`[PUT] Successfully put item for id: ${mixtureId}`, obj.uploaded.toISOString());
		return json({ ok: true });
	} catch (err: any) {
		rollbar.error(`[PUT] Error processing push:`, err.message, err);
		throw error(500, `Failed to process push: ${err.message}`);
	}
};

// delete the file with the given id
export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	const mixtureId = params.id;

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
		rollbar.error(`[DELETE] Error processing delete:`, err.message, err);
		throw error(500, `Failed to process delete: ${err.message}`);
	}
	return json({ ok: true });
};
