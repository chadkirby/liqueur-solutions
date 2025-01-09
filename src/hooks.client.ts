import { rollbar } from '$lib/rollbar';
import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = ({ error, event }) => {
	rollbar.error('Client error', {
		error,
		url: event.url.pathname
	});

	return {
		message: (error as Error).message
	};
};
