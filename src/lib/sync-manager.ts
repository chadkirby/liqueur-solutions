import { SyncManager } from '@signaldb/sync';
import { EventEmitter } from '@signaldb/core';

const errorEmitter = new EventEmitter();
errorEmitter.on('error', (message: string) => {
	// display validation errors to the user
	console.error('Sync error: ' + message);
});

export const syncManager = new SyncManager({
	autostart: false,
	debounceTime: 1000,
	pull: async ({ apiPath }) => {
		console.log('Fetching cloud files from:', apiPath);
		const resp = await fetch(apiPath);
		// handle 404
		if (resp.status === 404) {
			console.error('FilesDb: Cloud files not found');
			return { items: [] };
		}
		if (!resp.ok) {
			throw new Error('FilesDb: Failed to fetch cloud files: ' + resp.statusText);
		}
		const items = await resp.json();

		return { items };
	},
	push: async ({ apiPath }, { changes }) => {
		console.log('Pushing changes to cloud:', apiPath, changes);
		await Promise.all(
			changes.added.map(async (item) => {
				const response = await fetch(`${apiPath}/${item.id}`, {
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
				const response = await fetch(`${apiPath}/${item.id}`, {
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
				const response = await fetch(`${apiPath}/${item.id}`, {
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

