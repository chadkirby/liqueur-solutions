type Predicate<T> = (item: T, i: number) => boolean;

export class FancyIterator<T> implements Iterable<T> {
	private iterableIterator: Iterator<T>;

	constructor(iterator: Iterator<T> | Iterable<T>) {
		this.iterableIterator = Symbol.iterator in iterator ? iterator[Symbol.iterator]() : iterator;
	}

	find(predicate: Predicate<T>): Readonly<T> | undefined {
		let i = 0;
		for (const item of this) {
			if (predicate(item, i++)) return item;
		}
		return undefined;
	}

	filter(predicate: Predicate<T>): T[] {
		const results: T[] = [];
		let i = 0;
		for (const item of this) {
			if (predicate(item, i++)) results.push(item);
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

	reduce<U>(reducer: (accumulator: U, item: T) => U, initialValue: U): U {
		let accumulator = initialValue;
		for (const item of this) {
			accumulator = reducer(accumulator, item);
		}
		return accumulator;
	}

	every(predicate: Predicate<T>): boolean {
		let i = 0;
		for (const item of this) {
			if (!predicate(item, i++)) return false;
		}
		return true;
	}

	some(predicate: Predicate<T>): boolean {
		let i = 0;
		for (const item of this) {
			if (predicate(item, i++)) return true;
		}
		return false;
	}

	[Symbol.iterator](): Iterator<T> {
		return {
			next: () => this.iterableIterator.next(),
		};
	}
}
