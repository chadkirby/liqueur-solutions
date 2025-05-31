/**
 * Server-side endpoint for listing a user's files.
 */
import { error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getR2Bucket } from '$lib/r2';
import type { FileDataV1 } from '$lib/data-format.js';

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
		console.log(`[Mixtures] Unauthenticated access attempt. Returning empty patch and LMI 0.`);
		throw error(401, 'Unauthorized');
	}

	// Authenticated user: fetch data from R2
	try {
		// Only fetch and create patch if the version changed
		// Sanitize userId for safe inclusion in R2 object keys: only alphanumeric and underscore.
		const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_');

		// List all file objects for this authenticated user from R2 and stream them back to the client as we get them.
		const stream = new ReadableStream({
			async start(controller) {
				try {
					// First get the complete list of files
					const files = await bucket.list({ prefix: `files/${safeId}/` });
					console.log(`[Mixtures] Found ${files.objects.length} files for user ${userId}`);

					// Then process each file one by one
					for (const item of files.objects) {
						try {
							const file = await bucket.get(item.key);
							if (!file) {
								console.log(`[Mixtures] No file found for id: ${item.key}`);
								continue; // Skip to the next item if file not found
							}

							const fileData = (await file.json()) as FileDataV1;
							// exclude the ingredientJSON (shouldn't exist) and ingredientDb fields from the response
							const { ingredientJSON, ingredientDb, ...rest } = fileData as any;
							// Send each object as a complete JSON string followed by newline
							const jsonLine = JSON.stringify(rest) + '\n';
							controller.enqueue(new TextEncoder().encode(jsonLine));
						} catch (fileErr) {
							// Log error for this specific file but continue processing others
							console.error(`[Mixtures] Error processing file ${item.key}:`, fileErr);
							// Don't rethrow - we want to continue with other files
						}
					}

					// Only close the controller after processing all files
					controller.close();
				} catch (err) {
					console.error(`[Mixtures] Error listing files:`, err);
					controller.error(
						new Error(`Failed to list files: ${err instanceof Error ? err.message : String(err)}`),
					);
				}
			},
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'application/json',
			},
		});
	} catch (err: any) {
		// Explicitly type err
		console.error(`[Mixtures] Error processing list:`, err.message, err);
		// Even in case of error generating patch, try to send the LMI
		throw error(500, `Failed to process pull: ${err.message}`);
	}
};
