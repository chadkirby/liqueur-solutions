import type { StorageId } from '$lib/storage-id.js';
import type { FileDataV2, IngredientItemData } from '$lib/data-format.js';

export type LoadData = {
	storeId: StorageId;
};

// Server load data will be available via $page.data
export type ServerLoadData = {
	storeId: string;
	serverMixture: FileDataV2 | null;
	serverIngredients: IngredientItemData[] | null;
	serverErrors: string[] | null;
};
