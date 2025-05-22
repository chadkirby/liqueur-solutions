import { derived, type Readable } from 'svelte/store';
import { partyKitSyncStore as partyKitSyncStore } from './files-db.js';
import type { StorageId } from './storage-id.js';

// Previously: export const starredIds = $state<StorageId[]>([]); (Svelte 5 runes)
// Or: export const starredIds: Writable<StorageId[]> = writable([]); (Svelte 3/4 stores)

// Now, it's a derived store:
export const starredIds: Readable<StorageId[]> = derived<typeof partyKitSyncStore, StorageId[]>(
	partyKitSyncStore, // Depend on the partyKitSyncStore which holds the PartyKitSync instance
	($pks, set) => {
		if ($pks) {
			// If the PartyKitSync instance exists, subscribe to its stars store
			const starsUnsubscribe = $pks.getStars().subscribe((starsArray) => {
				set(starsArray); // Update the derived store with the current stars
			});
			// Return the unsubscribe function for when this derived store itself is unsubscribed from
			return () => {
				starsUnsubscribe();
			};
		} else {
			// No PartyKitSync instance, so no stars, set to empty array
			set([]);
			// No unsubscribe function to return in this case
		}
	},
	[], // Initial value for the derived store
);

// Note: If components were directly mutating `starredIds` (e.g., starredIds.push()),
// they will now need to call methods on the PartyKitSync instance,
// e.g., get(partyKitSyncStore)?.addStar(id) or get(partyKitSyncStore)?.deleteStar(id).
// The `starredIds` store itself is now Readable, not directly writable from components.
