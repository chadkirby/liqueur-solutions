import type { SerializedComponent } from './component.js';
import type { StorageId } from './storage-id.js';

export type LoadDataFromStore = {
	storeId: StorageId;
};

export type LoadDataFromUrl = {
	storeId: null;
	liqueur: string;
	components: Array<SerializedComponent>;
};
