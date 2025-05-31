/**
 * simple non-crypto hash function
 */
export class SimpleHash {
	// The magic number 5381 is a prime number, which helps to reduce collisions.
	private hash: number = 5381;

	// This is the xor version of Daniel J. Bernstein's 'times 33' hash function.
	// The magic number 33 works better than many other constants, but nobody has
	// ever adequately explained why.
	update(str: string) {
		for (let ii = 0; ii < str.length; ii++) {
			this.hash = (this.hash * 33) ^ str.charCodeAt(ii);
		}
		return this;
	}
	toString(radix = 36) {
		return (this.hash >>> 0).toString(radix);
	}
}
