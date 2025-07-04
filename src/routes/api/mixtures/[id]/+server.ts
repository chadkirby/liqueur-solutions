/**
 * Server-side endpoint for listing a user's files.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getR2Bucket } from '$lib/r2';
import { zFileDataV1, type FileDataV1 } from '$lib/data-format.js';
import { readMixtureObject, writeMixtureObject } from '../r2-mx-utils.js';

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

	try {
		const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_');
		const key = `files/${safeId}/${mixtureId}`;

		// get the requested file for this authenticated user from R2.
		const obj = await readMixtureObject(bucket, key);
		if (obj === 404) {
			throw error(404, { message: `File not found for id: files/${safeId}/${mixtureId}` });
		}
		if (!obj?.success) {
			throw error(
				400,
				`Invalid data for id: ${mixtureId}` +
					(obj.error.issues.length
						? `; Details: ${obj.error.issues
								.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
								.join(', ')}`
						: ''),
			);
		}

		return json(obj.data);
	} catch (err: any) {
		// Explicitly type err
		console.error(`[Pull] Error processing list:`, err.message, err);
		// Even in case of error generating patch, try to send the LMI
		throw error(err.status ? err.status : 500, `Failed to process pull: ${err.message}`);
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

	const safeId = userId.replace(/[^a-z0-9]/gi, '_');
	const key = `files/${safeId}/${mixtureId}`;

	try {
		const rawData = await request.json();
		const parsedData = zFileDataV1.safeParse(rawData);
		if (!parsedData.success) {
			console.error(`[PUT] Invalid data for id: ${mixtureId}`, parsedData.error.issues);
			throw error(400, `Invalid data for id: ${mixtureId}`);
		}
		const item: FileDataV1 = parsedData.data;
		const obj = await writeMixtureObject(bucket, key, item);

		if (!obj) {
			console.error(`[PUT] Failed to put item for id: ${mixtureId}`);
			throw error(500, `Failed to put item for id: ${mixtureId}`);
		}
		console.log(`[PUT] Successfully put item for id: ${mixtureId}`, obj.uploaded.toISOString());
		return json({ ok: true });
	} catch (err: any) {
		console.error(`[PUT] Error processing push:`, err.message, err);
		throw error(err.status ? err.status : 500, `Failed to process push: ${err.message}`);
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
