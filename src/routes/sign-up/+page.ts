/**
 * expect to be called with login?next=[url]
 */
export function load(args) {
	const { url } = args;

	return {
		next: url.searchParams.get('next') || '/new'
	};
}
