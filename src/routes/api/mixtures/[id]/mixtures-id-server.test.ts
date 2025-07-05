import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as r2Utils from '../../api-utils.js';
import { zFileDataV2, type FileDataV2 } from '$lib/data-format.js';

import * as server from './+server.js';
import { readResponseBody } from '$lib/test-utils.js';

let mockBucket: any = {};

vi.mock('$lib/r2.js', () => ({
	getR2Bucket: () => mockBucket,
}));

describe('/api/mixtures/[id] endpoint', () => {
	let platform: any;
	let locals: any;
	let params: any;

	beforeEach(() => {
		mockBucket = {
			delete: vi.fn(),
		};
		platform = { some: 'platform' };
		locals = { userId: 'user123' };
		params = { id: 'mix1' };

		vi.resetModules();
		vi.spyOn(r2Utils, 'readMixtureObject').mockReset();
		vi.spyOn(r2Utils, 'writeMixtureObject').mockReset();
		vi.doMock('$lib/r2.js', () => ({
			getR2Bucket: () => mockBucket,
		}));
	});

	describe('GET', () => {
		it('returns 401 if unauthenticated', async () => {
			const event = { params, platform, locals: {} } as any;
			await expect(server.GET(event)).rejects.toHaveProperty('status', 401);
		});

		it('returns 500 if platform missing', async () => {
			const event = { params, platform: undefined, locals } as any;
			await expect(server.GET(event)).rejects.toHaveProperty('status', 500);
		});

		it('returns 404 if file not found', async () => {
			vi.spyOn(r2Utils, 'readMixtureObject').mockResolvedValueOnce(404);
			const event = { params, platform, locals } as any;
			await expect(server.GET(event)).rejects.toHaveProperty('status', 404);
		});

		it('returns 400 if invalid data', async () => {
			vi.spyOn(r2Utils, 'readMixtureObject').mockResolvedValueOnce({
				success: false,
				error: {
					issues: [
						{
							path: ['foo'],
							message: 'bad',
							code: 'custom',
							input: {},
						},
					],
				},
			} as any);
			const event = { params, platform, locals } as any;
			await expect(server.GET(event)).rejects.toHaveProperty('status', 400);
		});

		it('returns 200 and file data on success', async () => {
			const fileData: FileDataV2 = {
				version: 1,
				id: 'mix1',
				name: 'Test Mixture',
				accessTime: new Date().toISOString(),
				desc: 'desc',
				rootIngredientId: 'root',
				ingredientDb: [['db1', { id: 'i1', ingredients: [] }]],
				_ingredientHash: 'hash',
			};
			vi.spyOn(r2Utils, 'readMixtureObject').mockResolvedValueOnce({
				success: true,
				data: fileData,
			});
			const event = { params, platform, locals } as any;
			const response = await server.GET(event);
			expect(response.status).toBe(200);
			const bodyData = await readResponseBody(response.body!);

			expect(bodyData).toEqual(fileData);
		});

		it('returns 500 on R2 error', async () => {
			vi.spyOn(r2Utils, 'readMixtureObject').mockRejectedValueOnce(new Error('R2 fail'));
			const event = { params, platform, locals } as any;
			await expect(server.GET(event)).rejects.toHaveProperty('status', 500);
		});
	});

	describe('PUT', () => {
		it('returns 401 if unauthenticated', async () => {
			const event = { params, platform, locals: {}, request: { json: vi.fn() } } as any;
			await expect(server.PUT(event)).rejects.toHaveProperty('status', 401);
		});

		it('returns 500 if platform missing', async () => {
			const event = { params, platform: undefined, locals, request: { json: vi.fn() } } as any;
			await expect(server.PUT(event)).rejects.toHaveProperty('status', 500);
		});

		it('returns 400 if invalid data', async () => {
			const event = {
				params,
				platform,
				locals,
				request: { json: vi.fn().mockResolvedValue({ not: 'valid' }) },
			} as any;
			vi.spyOn(zFileDataV2, 'safeParse').mockReturnValue({
				success: false,
				error: { issues: [] },
			} as any);
			await expect(server.PUT(event)).rejects.toHaveProperty('status', 400);
		});

		it('returns 200 and ok on success', async () => {
			const validData: FileDataV2 = {
				version: 1,
				id: 'mix1',
				name: 'Test Mixture',
				accessTime: new Date().toISOString(),
				desc: 'desc',
				rootIngredientId: 'root',
				ingredientDb: [['db1', { id: 'i1', ingredients: [] }]],
				_ingredientHash: 'hash',
			};
			const event = {
				params,
				platform,
				locals,
				request: { json: vi.fn().mockResolvedValue(validData) },
			} as any;
			vi.spyOn(zFileDataV2, 'safeParse').mockReturnValue({ success: true, data: validData } as any);
			vi.spyOn(r2Utils, 'writeMixtureObject').mockResolvedValueOnce({
				key: 'key',
				version: 'v1',
				size: 1,
				etag: 'etag',
				httpEtag: 'etag',
				uploaded: new Date(),
				checksums: { toJSON: () => ({}) },
				customMetadata: {},
				httpMetadata: {},
				range: undefined,
				storageClass: 'standard',
				writeHttpMetadata: () => {},
			});
			const response = await server.PUT(event);
			expect(response.status).toBe(200);
			const bodyData = await readResponseBody(response.body!);
			expect(bodyData).toEqual({ ok: true });
		});

		it('returns 500 on write error', async () => {
			const validData: FileDataV2 = {
				version: 1,
				id: 'mix1',
				name: 'Test Mixture',
				accessTime: new Date().toISOString(),
				desc: 'desc',
				rootIngredientId: 'root',
				ingredientDb: [['db1', { id: 'i1', ingredients: [] }]],
				_ingredientHash: 'hash',
			};
			const event = {
				params,
				platform,
				locals,
				request: { json: vi.fn().mockResolvedValue(validData) },
			} as any;
			vi.spyOn(zFileDataV2, 'safeParse').mockReturnValue({ success: true, data: validData } as any);
			vi.spyOn(r2Utils, 'writeMixtureObject').mockResolvedValueOnce(null);
			await expect(server.PUT(event)).rejects.toHaveProperty('status', 500);
		});

		it('returns 500 on R2 error', async () => {
			const validData = { id: 'mix1', foo: 'bar' };
			const event = {
				params,
				platform,
				locals,
				request: { json: vi.fn().mockResolvedValue(validData) },
			} as any;
			vi.spyOn(zFileDataV2, 'safeParse').mockReturnValue({ success: true, data: validData } as any);
			vi.spyOn(r2Utils, 'writeMixtureObject').mockRejectedValueOnce(new Error('fail'));
			await expect(server.PUT(event)).rejects.toHaveProperty('status', 500);
		});
	});

	describe('DELETE', () => {
		it('returns 401 if unauthenticated', async () => {
			const event = { params, platform, locals: {} } as any;
			await expect(server.DELETE(event)).rejects.toHaveProperty('status', 401);
		});

		it('returns 500 if platform missing', async () => {
			const event = { params, platform: undefined, locals } as any;
			await expect(server.DELETE(event)).rejects.toHaveProperty('status', 500);
		});

		it('returns 200 and ok on success', async () => {
			mockBucket.delete.mockResolvedValueOnce(null);
			const event = { params, platform, locals } as any;
			const response = await server.DELETE(event);
			expect(response.status).toBe(200);
			const bodyData = await readResponseBody(response.body!);
			expect(bodyData).toEqual({ ok: true });
		});

		it('returns 500 on R2 error', async () => {
			mockBucket.delete.mockRejectedValueOnce(new Error('fail'));
			const event = { params, platform, locals } as any;
			await expect(server.DELETE(event)).rejects.toHaveProperty('status', 500);
		});
	});
});
