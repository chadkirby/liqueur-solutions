import type { StorageId } from './storage-id.js';

export function openFile(id: StorageId | null): void {
	if (!id) {
		window.location.href = '/new';
	} else {
		// client-side navigation does not work???
		// goto(`/edit/${id}`, { invalidateAll: true });
		window.location.href = `/edit/${id}`;
	}
}

export function openFileInNewTab(id: StorageId): void {
	window.open(`/edit/${id}`, '_blank');
}
