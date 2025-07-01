/**
 * Server-side endpoint for listing a user's files.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getR2Bucket } from '$lib/r2';
import { zFileDataV1, type FileDataV1 } from '$lib/data-format.js';
import { readMixtureObject, writeMixtureObject } from '../r2-mx-utils.js';
import { rollbar } from '$lib/rollbar';

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
		const data = await readMixtureObject(bucket, key);
		if (!data) {
			throw error(404, `File not found for id: files/${safeId}/${mixtureId}`);
		}

		return json(data);
	} catch (err: any) {
		// Explicitly type err
		rollbar.error(`Error GET file:`, err.message, err);
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

	const safeId = userId.replace(/[^a-z0-9]/gi, '_');
	const key = `files/${safeId}/${mixtureId}`;

	try {
		const rawData = await request.json();
		const parsedData = zFileDataV1.safeParse(rawData);
		if (!parsedData.success) {
			rollbar.error(`[PUT] Invalid data for id: ${mixtureId}`, parsedData.error.issues);
			throw error(400, `Invalid data for id: ${mixtureId}`);
		}
		const item: FileDataV1 = parsedData.data;
		const obj = await writeMixtureObject(bucket, key, item);

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
		await bucket.delete(`files/${safeId}/${mixtureId}`);
	} catch (err: any) {
		rollbar.error(`[DELETE] Error deleting file:`, err.message, err);
		throw error(500, `Failed to process delete: ${err.message}`);
	}
	return json({ ok: true });
};
