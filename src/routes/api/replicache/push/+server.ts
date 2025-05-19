import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getR2Bucket } from '$lib/r2';

export async function POST({ request, platform, locals }: RequestEvent) {
	if (!platform) {
		console.log('[Push-Dev] DEV MODE: Skipping R2 operations.');
		// In dev, you might still want to simulate LMI for client testing if possible,
		// or ensure your client handles the simple {ok: true} without LMI updates.
		return json({ ok: true });
	}

	const push = await request.json();
	// Extract fields from the provided push body structure
	const { clientGroupID, mutations, pushVersion } = push;

	if (pushVersion !== 1) {
		// Or your supported version
		console.error(
			`[Push] Unsupported pushVersion: ${pushVersion} for clientGroupID: ${clientGroupID}`,
		);
		throw error(400, `Unsupported version: ${pushVersion}`);
	}

	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		console.error('[Push] Unauthorized: No userId found in locals.');
		throw error(401, 'Unauthorized');
	}

	// Optional: Validate that the authenticated userId (from Clerk)
	// is authorized to act for this clientGroupID or profileID.
	// For example, profileID might map to your userId.
	// console.log(`[Push] Authenticated userId: ${userId}, Push profileID: ${profileID}, Push clientGroupID: ${clientGroupID}`);
	// if (userId !== profileID) { // Or some other mapping logic
	//  console.error(`[Push] Mismatch between authenticated user ${userId} and push profileID ${profileID}`);
	//  throw error(403, 'Forbidden: User does not match profile');
	// }

	console.log(
		`[Push] Received push for clientGroupID: '${clientGroupID}', pushVersion: ${pushVersion}, mutations count: ${mutations.length}`,
	);

	const bucket = getR2Bucket(platform);
	const lmiKey = `lmi/${clientGroupID}`; // LMI is tracked per clientGroupID
	let serverLMI = 0;

	try {
		const lmiObj = await bucket.get(lmiKey);
		if (lmiObj) {
			const lmiText = await lmiObj.text();
			serverLMI = parseInt(lmiText, 10);
			if (isNaN(serverLMI)) {
				console.warn(`[Push] Invalid LMI found in R2 for ${lmiKey}: '${lmiText}'. Resetting to 0.`);
				serverLMI = 0;
			}
		}
		console.log(`[Push] Current serverLMI for '${clientGroupID}': ${serverLMI}`);
	} catch (e: any) {
		console.error(
			`[Push] Error fetching LMI for '${clientGroupID}' from R2 key '${lmiKey}':`,
			e.message,
		);
		throw error(500, 'Failed to retrieve server state.');
	}

	let updatedLMI = serverLMI;

	for (const mutation of mutations) {
		// The clientID inside mutation is the specific client instance, not used for LMI tracking here.
		const { id: mutationID, name, args } = mutation;
		console.log(
			`[Push] Evaluating mutation for clientGroupID '${clientGroupID}': id=${mutationID}, name='${name}', args='${JSON.stringify(args).slice(0, 100)}'...`,
		);

		if (mutationID <= updatedLMI) {
			console.log(
				`[Push] Skipping already processed mutation id ${mutationID} for clientGroupID '${clientGroupID}' (updatedLMI: ${updatedLMI})`,
			);
			continue;
		}

		// Optional: Strict check for contiguous mutation IDs.
		// if (mutationID > updatedLMI + 1) {
		// 	console.warn(`[Push] Mutation id ${mutationID} for clientGroupID '${clientGroupID}' is not contiguous. Expected ${updatedLMI + 1}. Halting processing.`);
		// 	await bucket.put(lmiKey, updatedLMI.toString());
		// 	throw error(409, `Mutation gap detected. Expected ${updatedLMI + 1}, got ${mutationID}.`);
		// }

		try {
			console.log(
				`[Push] Applying mutation for clientGroupID '${clientGroupID}': id=${mutationID}, name='${name}'`,
			);
			// Data operations use `userId` from `locals` for namespacing/authorization
			switch (name) {
				case 'updateFile': {
					const item = args;
					const key = `files/${userId}/${item.id}`; // Data namespaced by userId
					const putResult = await bucket.put(key, JSON.stringify(item), {
						customMetadata: { mutationID: mutationID.toString() },
					});
					console.log(
						`[Push] R2 put (updateFile) for clientGroupID '${clientGroupID}': key='${putResult?.key}', version='${putResult?.version}', size=${putResult?.size}`,
					);
					break;
				}
				case 'deleteFile': {
					const id = args;
					const fileKey = `files/${userId}/${id}`; // Data namespaced by userId
					const starKey = `stars/${userId}/${id}`; // Data namespaced by userId
					console.log(
						`[Push] Attempting to deleteFile for clientGroupID '${clientGroupID}': key='${fileKey}'`,
					);
					await bucket.delete(fileKey);
					console.log(
						`[Push] R2 delete (deleteFile) for clientGroupID '${clientGroupID}': key='${fileKey}' successful.`,
					);
					console.log(
						`[Push] Attempting to delete star for file for clientGroupID '${clientGroupID}': key='${starKey}'`,
					);
					await bucket.delete(starKey);
					console.log(
						`[Push] R2 delete (deleteStar for file) for clientGroupID '${clientGroupID}': key='${starKey}' successful.`,
					);
					break;
				}
				case 'addStar': {
					const id = args;
					const key = `stars/${userId}/${id}`; // Data namespaced by userId
					const putResult = await bucket.put(key, JSON.stringify(true), {
						customMetadata: { mutationID: mutationID.toString() },
					});
					console.log(
						`[Push] R2 put (addStar) for clientGroupID '${clientGroupID}': key='${putResult?.key}', version='${putResult?.version}', size=${putResult?.size}`,
					);
					break;
				}
				case 'deleteStar': {
					const id = args;
					const key = `stars/${userId}/${id}`; // Data namespaced by userId
					console.log(
						`[Push] Attempting to deleteStar for clientGroupID '${clientGroupID}': key='${key}'`,
					);
					await bucket.delete(key);
					console.log(
						`[Push] R2 delete (deleteStar) for clientGroupID '${clientGroupID}': key='${key}' successful.`,
					);
					break;
				}
				default:
					console.warn(
						`[Push] Unknown mutation encountered for clientGroupID '${clientGroupID}': name='${name}'`,
					);
					throw error(400, `Unknown mutation: ${name}`);
			}
			updatedLMI = Math.max(updatedLMI, mutationID); // Successfully processed, update LMI
			console.log(
				`[Push] Successfully processed mutation id ${mutationID} for clientGroupID '${clientGroupID}'. Tentative LMI: ${updatedLMI}`,
			);
		} catch (err: any) {
			console.error(
				`[Push] Error processing mutation id ${mutationID}, name='${name}' for clientGroupID '${clientGroupID}': ${err.message}`,
				err,
			);
			try {
				await bucket.put(lmiKey, updatedLMI.toString()); // Store LMI up to last success
				console.log(
					`[Push] Stored LMI ${updatedLMI} to R2 key '${lmiKey}' for clientGroupID '${clientGroupID}' before re-throwing error.`,
				);
			} catch (storeErr: any) {
				console.error(
					`[Push] CRITICAL: Failed to store LMI to R2 for clientGroupID '${clientGroupID}' after mutation processing error: ${storeErr.message}`,
				);
			}
			throw error(500, `Failed to process mutation '${name}' (id ${mutationID}): ${err.message}`);
		}
	}

	try {
		await bucket.put(lmiKey, updatedLMI.toString());
		console.log(
			`[Push] All mutations processed for clientGroupID '${clientGroupID}'. Final LMI ${updatedLMI} stored to R2 key '${lmiKey}'.`,
		);
	} catch (e: any) {
		console.error(
			`[Push] CRITICAL: Failed to store final LMI ${updatedLMI} to R2 key '${lmiKey}' for clientGroupID '${clientGroupID}':`,
			e.message,
		);
		throw error(500, 'Failed to save server state after processing mutations.');
	}

	// Acknowledge processed mutations by returning the latest mutation ID
	return json({ ok: true, lastMutationID: updatedLMI });
}
