import { describe, it, expect, vi, beforeEach } from 'vitest';
import { zFileDataV2, type FileDataV2 } from '$lib/data-format.js';

import * as server from './+server.js';
import { readResponseBody } from '$lib/test-utils.js';

let mockDB: any = {};

vi.mock('$lib/cf-bindings.js', () => ({
	getDB: () => mockDB,
}));

describe('/api/mixtures/[id] endpoint', () => {
	let platform: any;
	let locals: any;
	let params: any;
	let mockPreparedStatement: any;
	let mockBoundStatement: any;

	beforeEach(() => {
		mockBoundStatement = {
			first: vi.fn(),
			run: vi.fn(),
		};
		mockPreparedStatement = {
			bind: vi.fn().mockReturnValue(mockBoundStatement),
		};
		mockDB = {
			prepare: vi.fn().mockReturnValue(mockPreparedStatement),
		};
		platform = { some: 'platform' };
		locals = { userId: 'user123' };
		params = { id: 'mix1' };
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
			mockBoundStatement.first.mockResolvedValueOnce(null);
			const event = { params, platform, locals } as any;
			await expect(server.GET(event)).rejects.toHaveProperty('status', 404);
		});

		it('returns 400 if invalid data', async () => {
			const invalidData = {
				userid: 'user123',
				id: 'mix1',
				// Missing required fields
				starred: false,
			};
			mockBoundStatement.first.mockResolvedValueOnce(invalidData);
			const event = { params, platform, locals } as any;
			await expect(server.GET(event)).rejects.toHaveProperty('status', 400);
		});

		it('returns 200 and file data on success', async () => {
			const dbData = {
				userid: 'user123',
				id: 'mix1',
				name: 'Test Mixture',
				desc: 'desc',
				rootIngredientId: 'root',
				updated: new Date().toISOString(),
				hash: 'hash',
				starred: false,
			};
			mockBoundStatement.first.mockResolvedValueOnce(dbData);
			const event = { params, platform, locals } as any;
			const response = await server.GET(event);
			expect(response.status).toBe(200);
			const bodyData = await readResponseBody(response.body!);

			// Should return data without userid field
			const { userid, ...expectedData } = dbData;
			expect(bodyData).toEqual(expectedData);
		});

		it('returns 500 on database error', async () => {
			mockBoundStatement.first.mockRejectedValueOnce(new Error('Database fail'));
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
				id: 'mix1',
				name: 'Test Mixture',
				desc: 'desc',
				rootIngredientId: 'root',
				updated: new Date().toISOString(),
				hash: 'hash',
				starred: false,
			};
			const event = {
				params,
				platform,
				locals,
				request: { json: vi.fn().mockResolvedValue(validData) },
			} as any;
			vi.spyOn(zFileDataV2, 'safeParse').mockReturnValue({ success: true, data: validData } as any);
			mockBoundStatement.run.mockResolvedValueOnce({ success: true });
			const response = await server.PUT(event);
			expect(response.status).toBe(200);
			const bodyData = await readResponseBody(response.body!);
			expect(bodyData).toEqual({ ok: true });
		});

		it('returns 500 on write error', async () => {
			const validData: FileDataV2 = {
				id: 'mix1',
				name: 'Test Mixture',
				desc: 'desc',
				rootIngredientId: 'root',
				updated: new Date().toISOString(),
				hash: 'hash',
				starred: false,
			};
			const event = {
				params,
				platform,
				locals,
				request: { json: vi.fn().mockResolvedValue(validData) },
			} as any;
			vi.spyOn(zFileDataV2, 'safeParse').mockReturnValue({ success: true, data: validData } as any);
			mockBoundStatement.run.mockRejectedValueOnce(new Error('Database fail'));
			await expect(server.PUT(event)).rejects.toHaveProperty('status', 500);
		});

		it('returns 500 on database error', async () => {
			const validData = { id: 'mix1', foo: 'bar' };
			const event = {
				params,
				platform,
				locals,
				request: { json: vi.fn().mockResolvedValue(validData) },
			} as any;
			vi.spyOn(zFileDataV2, 'safeParse').mockReturnValue({ success: true, data: validData } as any);
			mockBoundStatement.run.mockRejectedValueOnce(new Error('fail'));
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
			mockBoundStatement.run.mockResolvedValueOnce({ success: true });
			const event = { params, platform, locals } as any;
			const response = await server.DELETE(event);
			expect(response.status).toBe(200);
			const bodyData = await readResponseBody(response.body!);
			expect(bodyData).toEqual({ ok: true });
		});

		it('returns 500 on database error', async () => {
			mockBoundStatement.run.mockRejectedValueOnce(new Error('Database fail'));
			const event = { params, platform, locals } as any;
			await expect(server.DELETE(event)).rejects.toHaveProperty('status', 500);
		});
	});
});
