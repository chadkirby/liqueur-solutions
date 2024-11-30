import { browser } from '$app/environment';
import { asStorageId, type StorageId } from './storage-id.js';

const startingStars = browser ? localStorage.getItem('stars') : '';

export const starredIds = $state(
	(startingStars?.split(',') || []).filter(Boolean).map(asStorageId)
);

export function toggleStar(id: StorageId): void {
	if (starredIds.includes(id)) {
		deleteStar(id);
	} else {
		addStar(id);
	}
}

function addStar(id: StorageId): void {
	if (starredIds.includes(id)) return;
	starredIds.push(id);
	if (browser) {
		localStorage.setItem('stars', starredIds.join(','));
	}
}

export function deleteStar(id: StorageId): void {
	const index = starredIds.indexOf(id);
	if (index > -1) {
		starredIds.splice(index, 1);
		if (browser) {
			localStorage.setItem('stars', starredIds.join(','));
		}
	}
}
