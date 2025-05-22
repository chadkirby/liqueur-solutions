import { writable, type Writable } from 'svelte/store';
import type PartyKitSync from '$lib/partykit-sync.js'; // Adjusted path, assuming partykit-sync.ts exports the class as default

export const partyKitSync: Writable<PartyKitSync | null> = writable(null);

export function initializePartyKitSync(userId: string, getToken: () => Promise<string | null>): PartyKitSync {
  const instance = new PartyKitSync(userId, getToken);
  partyKitSync.set(instance);
  return instance;
}
