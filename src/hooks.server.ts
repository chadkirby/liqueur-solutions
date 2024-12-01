import { sequence } from '@sveltejs/kit/hooks';
import { handleErrorWithSentry, sentryHandle } from '@sentry/sveltekit';
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	// import.meta.env.DEV is a vite feature
	enabled: !import.meta.env.DEV,
	dsn: 'https://a40ea5c38b739bfd82c782cf12f104f5@o4508394834231296.ingest.us.sentry.io/4508394837901312',
	tracesSampleRate: 1.0

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	// spotlight: import.meta.env.DEV,
});

// If you have custom handlers, make sure to place them after `sentryHandle()` in the `sequence` function.
export const handle = sequence(sentryHandle());

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();
