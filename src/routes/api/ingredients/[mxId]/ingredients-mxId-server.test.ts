import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readResponseBody } from '$lib/test-utils.js';
import { zIngredientItem } from '$lib/data-format.js';

import * as server from './+server.js';

let mockDB: any = {};

vi.mock('$lib/cf-bindings.js', () => ({
	getDB: () => mockDB,
}));

describe('/api/ingredients/[mxId] endpoint', () => {
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
		params = { mxId: 'mixture1' };
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

		it('returns 404 if ingredient not found', async () => {
			mockBoundStatement.first.mockResolvedValueOnce(null);
			const event = { params, platform, locals } as any;
			await expect(server.GET(event)).rejects.toHaveProperty('status', 404);
		});

		it('returns 400 if invalid data in database', async () => {
			const invalidData = '{"invalid": "data"}';
			mockBoundStatement.first.mockResolvedValueOnce({ data: invalidData });
			const event = { params, platform, locals } as any;
			await expect(server.GET(event)).rejects.toHaveProperty('status', 400);
		});

		it('returns 200 and ingredient data on success', async () => {
			const validIngredientData = {
				id: 'ingredient1',
				item: {
					id: 'water', // Valid substance ID
				},
			};
			const dbData = { data: JSON.stringify(validIngredientData) };
			mockBoundStatement.first.mockResolvedValueOnce(dbData);

			const event = { params, platform, locals } as any;
			const response = await server.GET(event);
			expect(response.status).toBe(200);

			const bodyData = await readResponseBody(response.body!);
			expect(bodyData).toEqual(validIngredientData);
		});

		it('returns 500 on database error', async () => {
			mockBoundStatement.first.mockRejectedValueOnce(new Error('Database fail'));
			const event = { params, platform, locals } as any;
			await expect(server.GET(event)).rejects.toThrow('Database fail');
		});
	});

	describe('DELETE', () => {
		it('returns 401 if unauthenticated', async () => {
			const event = { params, platform, locals: {}, request: { json: vi.fn() } } as any;
			await expect(server.DELETE(event)).rejects.toHaveProperty('status', 401);
		});

		it('returns 500 if platform missing', async () => {
			const event = { params, platform: undefined, locals, request: { json: vi.fn() } } as any;
			await expect(server.DELETE(event)).rejects.toHaveProperty('status', 500);
		});

		it('returns 400 if mxId missing', async () => {
			const event = { params: {}, platform, locals, request: { json: vi.fn() } } as any;
			await expect(server.DELETE(event)).rejects.toHaveProperty('status', 400);
		});

		it('returns 200 and ok on success', async () => {
			mockBoundStatement.run.mockResolvedValueOnce({ success: true });
			const event = { params, platform, locals, request: { json: vi.fn() } } as any;
			const response = await server.DELETE(event);
			expect(response.status).toBe(200);
			const bodyData = await readResponseBody(response.body!);
			expect(bodyData).toEqual({ ok: true });
		});

		it('returns 500 on database error', async () => {
			mockBoundStatement.run.mockRejectedValueOnce(new Error('Database fail'));
			const event = { params, platform, locals, request: { json: vi.fn() } } as any;
			await expect(server.DELETE(event)).rejects.toHaveProperty('status', 500);
		});
	});
});
