import type { SerializedComponent } from './components/index.js';
import type { Mixture } from './mixture.js';
import type { StorageId } from './storage-id.js';
import type { Analysis } from './utils.js';

export type LoadDataFromStore =
	| {
			storeId: StorageId;
			mixture: Mixture;
			name: string;
			totals: Analysis;
	  }
	| {
			storeId: '';
			mixture: null;
			name: '';
			totals: null;
	  };

export type LoadDataFromUrl = {
	storeId: null;
	name: string;
	components: Array<SerializedComponent>;
};
