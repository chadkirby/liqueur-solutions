/**
 * Server-side endpoint for listing a user's files.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getR2Bucket } from '$lib/r2';
import type { FileDataV1 } from '$lib/data-format.js';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
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

	// Authenticated user: fetch data from R2, compute patch, and new cookie fingerprint.
	try {
		// Only fetch and create patch if the version changed
		// Sanitize userId for safe inclusion in R2 object keys: only alphanumeric and underscore.
		const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_');

		// get the requested file for this authenticated user from R2.
		const file = await bucket.get(`files/${safeId}/${mixtureId}`);
		if (!file) {
			console.log(`[Pull] No file found for id: ${mixtureId}`);
			// return 404
			throw error(404, `File not found for id: ${mixtureId}`);
		}
		const fileText = await file.text();
		const fileData = JSON.parse(fileText) as FileDataV1;
		console.log(`[Pull] Found file for id: ${mixtureId}`, fileData);

		return json(fileData, {
			headers: {
				'X-Last-Sync-Time': file.uploaded.toISOString(),
				'X-Last-Sync-Hash': file.customMetadata?.ingredientHash || '',
			},
		});
	} catch (err: any) {
		// Explicitly type err
		console.error(`[Pull] Error processing list:`, err.message, err);
		// Even in case of error generating patch, try to send the LMI
		throw error(500, `Failed to process pull: ${err.message}`);
	}
};

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

	// get the X-Last-Sync-Time header as a Date
	const lastSync = request.headers.get('X-Last-Sync-Time') || new Date(0).toISOString();
	const uploadedBefore = new Date(lastSync);

	const safeId = userId.replace(/[^a-z0-9]/gi, '_');

	const head = await bucket.head(`files/${safeId}/${mixtureId}`);
	if (head && head.uploaded > uploadedBefore) {
		// If the file was modified since the last sync, return 412 Precondition Failed
		console.warn(
			`[PUT] Precondition failed for id: ${mixtureId}. File was modified since last sync.`,
			head.uploaded,
			uploadedBefore,
		);
		throw error(
			412,
			`This file was modified on the server at ${head.uploaded.toDateString()} ${head.uploaded.toTimeString()}, which is after your last sync at ${uploadedBefore.toDateString()} ${uploadedBefore.toTimeString()}. Do you want to overwrite the newer file on the server?`,
		);
	}

	try {
		const item = (await request.json()) as FileDataV1;
		console.log(`[PUT] Received item for id: ${mixtureId}`, item);

		const obj = await bucket.put(`files/${safeId}/${mixtureId}`, JSON.stringify(item), {
			customMetadata: {
				ingredientHash: item._ingredientHash,
				userAgent: request.headers.get('user-agent') || '',
			},
		});
		if (!obj) {
			console.error(`[PUT] Failed to put item for id: ${mixtureId}`);
			throw error(500, `Failed to put item for id: ${mixtureId}`);
		}
		console.log(`[PUT] Successfully put item for id: ${mixtureId}`, obj.uploaded.toISOString());
		return json({
			ok: true,
			lastSyncTime: obj.uploaded.toISOString(),
			lastSyncHash: item._ingredientHash,
		});
	} catch (err: any) {
		console.error(`[PUT] Error processing push:`, err.message, err);
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
		await bucket.delete(`files/${safeId}/${mixtureId}`);
	} catch (err: any) {
		console.error(`[Push] Error processing push:`, err.message, err);
		throw error(500, `Failed to process push: ${err.message}`);
	}
	return json({ ok: true });
};
