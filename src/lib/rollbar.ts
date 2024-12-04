import Rollbar from 'rollbar';

const ROLLBAR_TOKEN = import.meta.env.VITE_ROLLBAR_TOKEN;

export const rollbar = new Rollbar({
	accessToken: ROLLBAR_TOKEN,
	captureUncaught: true,
	captureUnhandledRejections: true,
	environment: import.meta.env.PROD ? 'production' : 'development',
	enabled: import.meta.env.PROD, // Only enable in production
	payload: {
		client: {
			javascript: {
				source_map_enabled: true,
				code_version: '1.0.0'
			}
		}
	}
});

// Utility function for tracking calculation events
export function trackCalculation(input: {
	success: boolean;
	error?: string;
	abv?: number;
	sweetness?: number;
}) {
	if (!import.meta.env.PROD) return; // Skip in development

	if (input.success) {
		rollbar.info('Calculation completed', {
			abv: input.abv,
			sweetness: input.sweetness
		});
	} else {
		rollbar.warning('Calculation failed', {
			error: input.error
		});
	}
}
