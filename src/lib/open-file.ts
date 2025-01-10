import type { StorageId } from './storage-id.js';

export function openFile(id: StorageId | null): void {
	if (!id) {
		window.location.href = '/new';
	} else {
		// client-side navigation does not work???
		// goto(`/file/${id}`, { invalidateAll: true });
		window.location.href = `/file/${id}`;
	}
}

export function openFileInNewTab(id: StorageId): void {
	window.open(`/file/${id}`, '_blank');
}
