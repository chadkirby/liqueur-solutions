export class FancyIterator<T> implements Iterable<T> {
	private iterableIterator: Iterator<T>;

	constructor(iterator: Iterator<T> | Iterable<T>) {
		this.iterableIterator = Symbol.iterator in iterator ? iterator[Symbol.iterator]() : iterator;
	}

	find(predicate: (item: T) => boolean): T | undefined {
		for (const item of this) {
			if (predicate(item)) return item;
		}
		return undefined;
	}

	filter(predicate: (item: T) => boolean): T[] {
		const results: T[] = [];
		for (const item of this) {
			if (predicate(item)) results.push(item);
		}
		return results;
	}

	map<U>(mapper: (item: T) => U): U[] {
		const results: U[] = [];
		for (const item of this) {
			results.push(mapper(item));
		}
		return results;
	}

	every(predicate: (item: T) => boolean): boolean {
		for (const item of this) {
			if (!predicate(item)) return false;
		}
		return true;
	}

	some(predicate: (item: T) => boolean): boolean {
		for (const item of this) {
			if (predicate(item)) return true;
		}
		return false;
	}

	[Symbol.iterator](): Iterator<T> {
		return {
			next: () => this.iterableIterator.next(),
		};
	}
}
