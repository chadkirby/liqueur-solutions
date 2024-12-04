import type { SerializedComponent } from './component.js';
import type { StorageId } from './local-storage.svelte';

export type LoadDataFromStore = {
	storeId: StorageId;
};

export type LoadDataFromUrl = {
	storeId: null;
	liqueur: string;
	components: Array<SerializedComponent>;
};
