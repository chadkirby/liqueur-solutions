import { SyncManager } from '@signaldb/sync';
import { EventEmitter } from '@signaldb/core'
import { MixtureFiles, Stars } from './persistence.svelte.js';

const apiBaseUrl = '../api';
const errorEmitter = new EventEmitter();
errorEmitter.on('error', (message: string) => {
	// display validation errors to the user
	console.error('Sync error: ' + message);
});

const syncManager = new SyncManager({
	autostart: false,
	debounceTime: 1000,
	pull: async ({ apiPath }) => {
		const resp = await fetch(`${apiBaseUrl}/${apiPath}`);
		if (!resp.ok) {
			throw new Error('FilesDb: Failed to fetch cloud files: ' + resp.statusText);
		}
    const items = await resp.json();

		return { items };
	},
	push: async ({ apiPath }, { changes }) => {
		await Promise.all(
			changes.added.map(async (item) => {
				const response = await fetch(`${apiBaseUrl}/${apiPath}/${item.id}`, {
					method: 'PUT',
					body: JSON.stringify(item),
				});
				const responseText = await response.text();
				if (response.status >= 400 && response.status <= 499) {
					errorEmitter.emit('error', responseText);
					return;
				}
			}),
		);

		await Promise.all(
			changes.modified.map(async (item) => {
				const response = await fetch(`${apiBaseUrl}/${apiPath}/${item.id}`, {
					method: 'PUT',
					body: JSON.stringify(item),
				});
				const responseText = await response.text();
				if (response.status >= 400 && response.status <= 499) {
					errorEmitter.emit('error', responseText);
					return;
				}
			}),
		);

		await Promise.all(
			changes.removed.map(async (item) => {
				const response = await fetch(`${apiBaseUrl}/${apiPath}/${item.id}`, {
					method: 'DELETE',
					body: JSON.stringify(item),
				});
				const responseText = await response.text();
				if (response.status >= 400 && response.status <= 499) {
					errorEmitter.emit('error', responseText);
					return;
				}
			}),
		);
	},
});
if (MixtureFiles) {
	syncManager.addCollection(MixtureFiles, {
		name: 'mixtures',
		apiPath: 'mixtures',
	});
}
if (Stars) {
	syncManager.addCollection(Stars, {
		name: 'stars',
		apiPath: 'stars',
	});
}

export function startSync() {
  syncManager.startSync('mixtures');
  syncManager.startSync('stars');
}

export function pauseSync() {
  syncManager.pauseSync('mixtures');
  syncManager.pauseSync('stars');
}


