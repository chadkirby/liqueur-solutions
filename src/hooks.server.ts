import type { Handle, HandleServerError } from '@sveltejs/kit';
import { createClerkClient } from '@clerk/backend';
import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
import { CLERK_SECRET_KEY } from '$env/static/private';

// Initialize Clerk backend client for server-side authentication
const clerkClient = createClerkClient({
	secretKey: CLERK_SECRET_KEY,
	publishableKey: PUBLIC_CLERK_PUBLISHABLE_KEY,
});

/**
 * Handle incoming requests, authenticate via Clerk, and populate locals.userId
 */
export const handle: Handle = async ({ event, resolve }) => {
	try {
		const authState = await clerkClient.authenticateRequest(event.request);
		const authObject = authState.toAuth();
		// Set userId in locals (undefined if not signed in)
		event.locals.userId = authObject?.userId ?? undefined;
	} catch (err) {
		console.error('Clerk authentication failed:', err);
		event.locals.userId = undefined;
	}
	return resolve(event);
};

export const handleError: HandleServerError = ({ error, event }) => {
	const e = error as Error;
	// Log to Cloudflare's built-in logging
	console.error('Server error:', {
		message: e.message,
		stack: e.stack,
		url: event.url.pathname,
		method: event.request.method,
	});

	return {
		message: (error as Error).stack ?? (error as Error).message,
	};
};
