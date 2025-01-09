import type { HandleServerError } from '@sveltejs/kit';
import { withClerkHandler } from 'clerk-sveltekit/server';

export const handle = withClerkHandler();

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
