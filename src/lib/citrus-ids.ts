export type IdPrefix = `(${string})`;
export type PrefixedId = `${IdPrefix}${string}`;

export function getIdPrefix(id: string): IdPrefix | null {
	const match = id.match(/^\([-\w]+\)/i);
	return (match?.at(0) as IdPrefix) ?? null;
}

const citrusJuiceNames = ['lemon', 'lime', 'orange', 'grapefruit'] as const;
export type CitrusJuiceName = (typeof citrusJuiceNames)[number];
export type CitrusJuiceIdPrefix = `(citrus-${CitrusJuiceName})`;
export type CitrusJuiceId = `${CitrusJuiceIdPrefix}${string}`;

const citrusPrefixPattern = new RegExp(`^\\(citrus-(?:${citrusJuiceNames.join('|')})\\)`, 'i');

export function getCitrusPrefix(id: string): CitrusJuiceIdPrefix | null {
	const match = id.match(citrusPrefixPattern);
	return (match?.at(0) as CitrusJuiceIdPrefix) ?? null;
}

/**
 * Empirically-derived factors representing the fraction of citric acid
 * that exists in its dissociated form in natural citrus juices. These
 * high values (90-99%) reflect that citrus fruits contain minerals and
 * other compounds that cause most of the citric acid to exist as
 * citrate rather than free acid.
 *
 * These factors allow us to model citrus juice pH without having to
 * account for the complex mixture of minerals and buffers present in
 * real fruit. They were calibrated to match measured pH values:
 * - Lemon juice: pH 2.3 (90.57% dissociated)
 * - Lime juice: pH 2.4 (93.83% dissociated)
 * - Orange juice: pH 3.3 (99.16% dissociated)
 * - Grapefruit juice: pH 3.3 (99.24% dissociated)
 *
 * The higher dissociation in orange and grapefruit juice aligns with
 * their higher pH values.
 */
const citrusDissociationFactors: Record<CitrusJuiceIdPrefix, number> = {
	'(citrus-lemon)': 0.9057,
	'(citrus-lime)': 0.93828,
	'(citrus-orange)': 0.99157,
	'(citrus-grapefruit)': 0.9924,
};
export function getCitrusDissociationFactor(id: string): number {
	const prefix = getCitrusPrefix(id);
	return prefix ? citrusDissociationFactors[prefix] : 0;
}
