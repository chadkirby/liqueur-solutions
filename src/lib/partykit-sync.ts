import { writable, type Writable } from 'svelte/store';
// import type { IngredientDbData } from './mixture-types.js'; // No longer directly needed here
import type { StoredFileDataV1, StorageId } from './data-types.js'; // Import from data-types.ts

// --- PartyKitSync Class ---
// currentDataVersion is now part of StoredFileDataV1 if needed, or managed by server

const PUBLIC_PARTYKIT_HOST = process.env.PUBLIC_PARTYKIT_HOST || 'localhost:1999'; // Default for local dev

export class PartyKitSync {
	private userId: string;
	private getToken: () => Promise<string | null>;
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 10;
	private reconnectInterval = 1000; // Initial reconnect interval in ms

	public files: Writable<StoredFileDataV1[]>;
	public stars: Writable<StorageId[]>; // Stores an array of starred file IDs

	constructor(userId: string, getToken: () => Promise<string | null>) {
		this.userId = userId;
		this.getToken = getToken;
		this.files = writable<StoredFileDataV1[]>([]);
		this.stars = writable<StorageId[]>([]);

		if (!userId) {
			console.error("PartyKitSync: userId is required for initialization.");
			// Potentially throw an error or handle this state more gracefully
			return;
		}
		this.connect();
	}

	private async getWebSocketUrl(): Promise<string> {
		const token = await this.getToken();
		if (!token) {
			throw new Error("Authentication token not available.");
		}
		const protocol = PUBLIC_PARTYKIT_HOST.startsWith('localhost') ? 'ws' : 'wss';
		return `${protocol}://${PUBLIC_PARTYKIT_HOST}/parties/user/user-${this.userId}?token=${token}`;
	}

	async connect(): Promise<void> {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			console.log("PartyKitSync: Already connected.");
			return;
		}

		try {
			const url = await this.getWebSocketUrl();
			this.ws = new WebSocket(url);

			this.ws.onopen = () => {
				console.log(`PartyKitSync: Connected to room user-${this.userId}`);
				this.reconnectAttempts = 0; // Reset on successful connection
				// Server will send initial data upon successful connection and authentication.
			};

			this.ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data as string);
					if (message.type === 'allData') {
						// Ensure data is in the expected format
						const filesData = (message.files || []).map((file: any) => ({
							...file,
							// Ensure ingredientDb is parsed if it was stringified by the server
							// However, our server currently stores it as TEXT, so it will be a string.
							// The client-side StoredFileDataV1 type allows IngredientDbData | string.
							// No specific parsing needed here unless server changes format.
							// ingredientDb: typeof file.ingredientDb === 'string' ? JSON.parse(file.ingredientDb) : file.ingredientDb,
						})) as StoredFileDataV1[];
						const starsData = (message.stars || []).map((s: { fileId: string }) => s.fileId) as StorageId[];

						this.files.set(filesData);
						this.stars.set(starsData);
						// console.log("PartyKitSync: Received allData", { files: filesData.length, stars: starsData.length });
					} else if (message.error) {
						console.error("PartyKitSync: Received error from server:", message.error);
					} else {
						// console.log("PartyKitSync: Received message:", message);
					}
				} catch (e) {
					console.error("PartyKitSync: Error parsing message from server:", e);
				}
			};

			this.ws.onclose = (event) => {
				console.log(`PartyKitSync: Connection closed (code: ${event.code}, reason: ${event.reason})`);
				this.ws = null;
				if (this.reconnectAttempts < this.maxReconnectAttempts) {
					const delay = Math.min(30000, this.reconnectInterval * Math.pow(2, this.reconnectAttempts));
					console.log(`PartyKitSync: Attempting to reconnect in ${delay}ms...`);
					setTimeout(() => this.connect(), delay);
					this.reconnectAttempts++;
				} else {
					console.error("PartyKitSync: Max reconnection attempts reached.");
				}
			};

			this.ws.onerror = (error) => {
				console.error("PartyKitSync: WebSocket error:", error);
				// onclose will likely be called next, triggering reconnection logic
			};
		} catch (error) {
			console.error("PartyKitSync: Failed to get WebSocket URL or initial connection failed:", error);
			// Handle token error or other pre-connection issues, maybe retry with backoff too
			if (this.reconnectAttempts < this.maxReconnectAttempts) {
				const delay = Math.min(30000, this.reconnectInterval * Math.pow(2, this.reconnectAttempts));
				console.log(`PartyKitSync: Attempting to reconnect (after initial fail) in ${delay}ms...`);
				setTimeout(() => this.connect(), delay);
				this.reconnectAttempts++;
			}
		}
	}

	private sendMessage(type: string, payload: unknown) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify({ type, payload }));
		} else {
			console.warn("PartyKitSync: WebSocket not connected. Message not sent:", { type, payload });
			// Optionally queue message or try to reconnect
		}
	}

	// --- Data Operations ---
	updateFile(fileData: StoredFileDataV1): void {
		// Ensure ingredientDb is stringified if it's an object, as the server expects a JSON string (TEXT column)
		const payload = {
			...fileData,
			ingredientDb: typeof fileData.ingredientDb === 'object'
				? JSON.stringify(fileData.ingredientDb)
				: fileData.ingredientDb,
			version: fileData.version // ensure version is part of the payload
		};
		this.sendMessage("updateFile", payload);
	}

	deleteFile(fileId: StorageId): void {
		this.sendMessage("deleteFile", { id: fileId });
	}

	addStar(fileId: StorageId): void {
		this.sendMessage("addStar", { id: fileId });
	}

	deleteStar(fileId: StorageId): void {
		this.sendMessage("deleteStar", { id: fileId });
	}

	requestAllData(): void {
		this.sendMessage("getAllData", {});
	}

	// --- Local Data Access and Subscriptions ---
	getFiles(): Writable<StoredFileDataV1[]> {
		return this.files;
	}

	getStars(): Writable<StorageId[]> {
		return this.stars;
	}

	readFile(id: StorageId): StoredFileDataV1 | undefined {
		let file: StoredFileDataV1 | undefined;
		this.files.subscribe(value => {
			file = value.find(f => f.id === id);
		})(); // Immediate subscribe and unsubscribe to get current value
		return file;
	}

	hasFile(id: StorageId): boolean {
		return !!this.readFile(id);
	}
	
	isStarred(id: StorageId): boolean {
		let starred = false;
		this.stars.subscribe(value => {
			starred = value.includes(id);
		})();
		return starred;
	}

	toggleStar(id: StorageId): void {
		if (this.isStarred(id)) {
			this.deleteStar(id);
		} else {
			this.addStar(id);
		}
	}

	// --- Cleanup ---
	close(): void {
		console.log("PartyKitSync: Closing connection and cleaning up.");
		this.reconnectAttempts = this.maxReconnectAttempts; // Prevent further reconnections
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.files.set([]);
		this.stars.set([]);
	}
}

// --- Global Instance (Placeholder for now) ---
// let partyKitSyncInstance: PartyKitSync | null = null;

// export function initializePartyKitSync(userId: string, getToken: () => Promise<string | null>): PartyKitSync {
//   if (!partyKitSyncInstance) {
//     partyKitSyncInstance = new PartyKitSync(userId, getToken);
//   } else if (partyKitSyncInstance.userId !== userId) {
//     // If userId changes, close old instance and create a new one
//     partyKitSyncInstance.close();
//     partyKitSyncInstance = new PartyKitSync(userId, getToken);
//   }
//   return partyKitSyncInstance;
// }

// export function getPartyKitSync(): PartyKitSync {
//   if (!partyKitSyncInstance) {
//     throw new Error("PartyKitSync not initialized. Call initializePartyKitSync first.");
//   }
//   return partyKitSyncInstance;
// }
// For now, we just export the class. Instantiation will be handled elsewhere.
export default PartyKitSync;

// Helper to ensure ingredientDb is stringified for server
// This might be better placed within the StoredFileDataV1 type or a utility function
// Removed ensureIngredientDbStringified as its logic is now directly in updateFile
