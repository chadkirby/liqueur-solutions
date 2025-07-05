import type { StorageId } from './storage-id.js';

export function openFile(id: StorageId | null): void {
	if (!id) {
		window.location.href = '/new';
	} else {
		// client-side navigation does not work???
		window.location.href = `/${id}/edit`;
	}
}

export function openFileInNewTab(id: StorageId): void {
	window.open(`/${id}/edit`, '_blank');
}
