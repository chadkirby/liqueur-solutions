import { Collection } from '@signaldb/core';
import type { BaseItem, CollectionOptions } from '@signaldb/core';
import type { ZodMiniType, infer as ZodInfer } from 'zod/v4-mini';

interface SchemaCollectionOptions<T extends ZodMiniType<BaseItem<I>>, I, U = ZodInfer<T>>
	extends CollectionOptions<ZodInfer<T>, I, U> {
	schema: T;
}

export class SchemaCollection<
	T extends ZodMiniType<BaseItem<I>>,
	I = any,
	U = ZodInfer<T>,
> extends Collection<ZodInfer<T>, I, U> {
	private schema: T;

	constructor(options: SchemaCollectionOptions<T, I, U>) {
		super(options);
		this.schema = options.schema;

		// Automatically validate each item against the Zod schema before saving
		this.on('validate', (item) => {
			this.schema.parse(item);
		});
	}
}
