import type { SerializedComponent } from './component.js';
import type { LocalStorageId } from './local-storage.js';

export type LoadDataFromStore = {
	storeId: LocalStorageId;
};

export type LoadDataFromUrl = {
	storeId: null;
	liqueur: string;
	components: Array<SerializedComponent>;
};
