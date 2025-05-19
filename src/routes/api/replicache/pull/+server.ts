/**
 * Server-side endpoint for Replicache pull requests.
 *
 * This handler receives pull requests from the Replicache client and returns:
 * - A new cookie (state fingerprint) in the format "~<timestamp>-<sha256 hash>".
 * - A patch array of put/delete operations to synchronize client state.
 * - For v1 requests: lastMutationIDChanges to reset mutation queues if needed.
 *
 * It supports:
 * - v1 API (with clientGroupID and lastMutationIDChanges).
 * - Development mode (when `platform` is undefined): returns empty patches.
 * - Unauthenticated users: returns no data.
 *
 * Data is stored per-user in R2:
 * - Files under "files/<safeUserId>/…", as JSON with a `version` field.
 * - Stars under "stars/<safeUserId>/…", stored as boolean `true`.
 *
 * Cookie generation:
 * - Collect tokens for each item: "<key>:<version>" (files) or "<key>:true" (stars).
 * - Sort tokens, join with "|", SHA-256 hash to hex.
 * - Prefix with "~<Date.now()>-" for lexicographic ordering.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getR2Bucket } from '$lib/r2';
import type { PatchOperation } from 'replicache';

export async function POST({ request, platform, locals }: RequestEvent) {
	// Parse the incoming pull request body.
	// The Replicache client sends JSON with fields:
	// - cookie: previous replication state fingerprint (string).
	// - clientGroupID: string for grouping mutations on the client.
	const pull = await request.json();
	// Extract clientGroupID for v1 API and validate presence.
	const clientGroupID = (pull as any).clientGroupID as string;
	if (typeof clientGroupID !== 'string') {
		console.error('[Pull] Missing clientGroupID in request body.');
		throw error(400, 'Missing clientGroupID');
	}
	// Use cookie from pull (as numeric value) or default to 0
	const prevVersion = Number(pull.cookie || 0);

	let serverLMI = 0; // Default LMI

	if (!platform) {
		// Development mode: no R2 available, return empty patch
		console.log(
			`[Pull-Dev] DEV MODE for clientGroupID: ${clientGroupID}. Returning empty patch and LMI 0.`,
		);
		return json({
			cookie: prevVersion,
			lastMutationIDChanges: { [clientGroupID]: serverLMI }, // Send default LMI
			patch: [],
		});
	}
	const bucket = getR2Bucket(platform);
	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		// Unauthenticated: no data
		console.log(
			`[Pull] Unauthenticated access attempt for clientGroupID: ${clientGroupID}. Returning empty patch and LMI 0.`,
		);
		return json({
			cookie: prevVersion,
			lastMutationIDChanges: { [clientGroupID]: serverLMI }, // Send default LMI
			patch: [],
		});
	}

	// Fetch the server's lastMutationID for this clientGroupID
	const lmiKey = `lmi/${clientGroupID}`;
	try {
		const lmiObj = await bucket.get(lmiKey);
		if (lmiObj) {
			const lmiText = await lmiObj.text();
			const parsedLMI = Number(lmiText || 0);
			if (!isNaN(parsedLMI)) {
				serverLMI = parsedLMI;
			} else {
				console.warn(`[Pull] Invalid LMI found in R2 for ${lmiKey}: '${lmiText}'. Using LMI 0.`);
			}
		}
		console.log(`[Pull] Fetched serverLMI for clientGroupID '${clientGroupID}': ${serverLMI}`);
	} catch (e: any) {
		console.error(
			`[Pull] Error fetching LMI for clientGroupID '${clientGroupID}' from R2 key '${lmiKey}': ${e.message}. Using LMI 0.`,
		);
		// Continue with LMI 0, but log the error. Depending on policy, you might throw.
	}

	// Use the serverLMI as the version/cookie
	const nextVersion = serverLMI;
	const changed = nextVersion > prevVersion;

	// Authenticated user: fetch data from R2, compute patch, and new cookie fingerprint.
	try {
		const items: Array<PatchOperation & { op: 'put' }> = [];

		// Only fetch and create patch if the version changed
		if (changed) {
			// Sanitize userId for safe inclusion in R2 object keys: only alphanumeric and underscore.
			const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_');

			// List all file objects for this authenticated user from R2.
			const files = await bucket.list({ prefix: `files/${safeId}/` });
			for (const obj of files.objects) {
				const r2Obj = await bucket.get(obj.key);
				const key = obj.key.replace(`files/${safeId}/`, 'files/'); // Strip user ID from key

				if (r2Obj) {
					items.push({
						op: 'put',
						key,
						value: await r2Obj.json(),
					});
				}
			}

			// List all 'star' flags for this user from R2.
			const stars = await bucket.list({ prefix: `stars/${safeId}/` });
			for (const obj of stars.objects) {
				items.push({
					op: 'put',
					key: obj.key.replace(`stars/${safeId}/`, 'stars/'), // Strip user ID from key
					value: true, // Stars are stored as presence, value is true
				});
			}
		}

		console.log(
			`[Pull] For clientGroupID '${clientGroupID}': Data changed: ${changed}. ` +
				`PrevVersion: ${prevVersion}, NextVersion: ${nextVersion}. Items: ${items.length}`,
		);

		return json({
			cookie: nextVersion, // Use numeric LMI as the cookie
			lastMutationIDChanges: { [clientGroupID]: serverLMI },
			patch: changed ? items : [],
		});
	} catch (err: any) {
		// Explicitly type err
		console.error(
			`[Pull] Error processing pull for clientGroupID '${clientGroupID}':`,
			err.message,
			err,
		);
		// Even in case of error generating patch, try to send the LMI
		throw error(500, `Failed to process pull: ${err.message}`);
	}
}
