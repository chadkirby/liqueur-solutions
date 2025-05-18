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

export async function POST({ request, platform, locals }: RequestEvent) {
	// Parse the incoming pull request body.
	// The Replicache client sends JSON with fields:
	// - cookie: previous replication state fingerprint (string).
	// - clientGroupID: string for grouping mutations on the client.
	const pull = await request.json();
	// Extract clientGroupID for v1 API and validate presence.
	const clientGroupID = (pull as any).clientGroupID as string;
	if (typeof clientGroupID !== 'string') {
		throw error(400, 'Missing clientGroupID');
	}
	// Use cookie from pull or default to empty.
	const prevCookie = typeof pull.cookie === 'string' ? pull.cookie : '';
	if (!platform) {
		// Development mode: no R2 available, return empty patch
		return json({
			cookie: prevCookie,
			lastMutationIDChanges: {},
			patch: [],
		});
	}
	const bucket = getR2Bucket(platform);
	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		// Unauthenticated: no data
		return json({
			cookie: prevCookie,
			lastMutationIDChanges: {},
			patch: [],
		});
	}

	// Authenticated user: fetch data from R2, compute patch, and new cookie fingerprint.
	try {
		const items = [];

		// Sanitize userId for safe inclusion in R2 object keys: only alphanumeric and underscore.
		const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_');

		// List all file objects for this authenticated user from R2.
		const files = await bucket.list({ prefix: `files/${safeId}/` });
		for (const obj of files.objects) {
			const content = await bucket.get(obj.key);
			if (content) {
				items.push({
					op: 'put',
					key: obj.key.replace(`files/${safeId}/`, 'files/'), // Strip user ID from key
					value: await content.json(),
				});
			}
		}

		// List all 'star' flags for this user from R2.
		const stars = await bucket.list({ prefix: `stars/${safeId}/` });
		for (const obj of stars.objects) {
			items.push({
				op: 'put',
				key: obj.key.replace(`stars/${safeId}/`, 'stars/'), // Strip user ID from key
				value: true,
			});
		}

		// Compute a fingerprint hash over the current item set to detect client desynchronization:
		// - Build tokens for each entry: "key:version" for files, "key:true" for stars.
		// - Sort tokens, join with "|", and SHA-256 hash.
		const tokens = items.map((it) =>
			it.key.startsWith('files/') ? `${it.key}:${(it.value as any).version}` : `${it.key}:true`,
		);
		tokens.sort();
		const encoder = new TextEncoder();
		const data = encoder.encode(tokens.join('|'));
		const hashBuf = await crypto.subtle.digest('SHA-256', data);
		const hashHex = Array.from(new Uint8Array(hashBuf))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
		// Build a lexicographically monotonic cookie string:
		// - Prefix "~" ensures it sorts after any legacy cookies.
		// - Include Date.now() for monotonicity and the content hash for change detection.
		const now = Date.now().toString();
		const newCookie = `~${now}-${hashHex}`;
		// Compute previous hash from prevCookie (after "-" if prefixed by "~").
		let prevHash = '';
		if (prevCookie.startsWith('~')) {
			const idx = prevCookie.indexOf('-');
			if (idx > 0) {
				prevHash = prevCookie.slice(idx + 1);
			}
		}
		const changed = prevHash !== hashHex;
		return json({
			cookie: changed ? newCookie : prevCookie,
			lastMutationIDChanges: changed ? { [clientGroupID]: 0 } : {},
			patch: changed ? items : [],
		});
	} catch (err) {
		console.error('Pull error:', err);
		throw error(500, 'Failed to process pull');
	}
}
