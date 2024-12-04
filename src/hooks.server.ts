import { rollbar } from '$lib/rollbar';
import type { HandleServerError } from '@sveltejs/kit';

export const handleError: HandleServerError = ({ error, event }) => {
	rollbar.error('Server error', {
		error,
		url: event.url.pathname,
		method: event.request.method
	});

	return {
		message: 'Something went wrong!'
	};
};
