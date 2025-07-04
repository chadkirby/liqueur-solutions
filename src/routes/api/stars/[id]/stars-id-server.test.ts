import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as server from './+server.js';
import { readResponseBody } from '$lib/test-utils.js';

let mockBucket: any = {};

vi.mock('$lib/r2.js', () => ({
	getR2Bucket: () => mockBucket,
}));

describe('/api/stars/[id] endpoint', () => {
	let platform: any;
	let locals: any;
	let params: any;

	beforeEach(() => {
		mockBucket = {
			put: vi.fn(),
			delete: vi.fn(),
		};
		platform = { some: 'platform' };
		locals = { userId: 'user123' };
		params = { id: 'star1' };

		vi.resetModules();
		vi.doMock('$lib/r2.js', () => ({
			getR2Bucket: () => mockBucket,
		}));
	});

	describe('PUT', () => {
		it('returns 401 if unauthenticated', async () => {
			const event = { params, platform, locals: {}, request: { json: vi.fn() } } as any;
			await expect(server.PUT(event)).rejects.toMatchObject({ status: 401 });
		});

		it('returns 500 if platform missing', async () => {
			const event = { params, platform: undefined, locals, request: { json: vi.fn() } } as any;
			await expect(server.PUT(event)).rejects.toMatchObject({ status: 500 });
		});

		it('returns 200 and ok on success', async () => {
			mockBucket.put.mockResolvedValueOnce({
				uploaded: new Date(),
			});
			const event = { params, platform, locals, request: { json: vi.fn() } } as any;
			const response = await server.PUT(event);
			expect(response.status).toBe(200);
			const bodyData = await readResponseBody(response.body!);
			expect(bodyData).toEqual({ ok: true });
		});

		it('returns 500 on R2 error', async () => {
			mockBucket.put.mockRejectedValueOnce(new Error('fail'));
			const event = { params, platform, locals, request: { json: vi.fn() } } as any;
			await expect(server.PUT(event)).rejects.toMatchObject({ status: 500 });
		});

		it('returns 500 on failed put', async () => {
			mockBucket.put.mockResolvedValueOnce(null);
			const event = { params, platform, locals, request: { json: vi.fn() } } as any;
			await expect(server.PUT(event)).rejects.toMatchObject({ status: 500 });
		});
	});

	describe('DELETE', () => {
		it('returns 401 if unauthenticated', async () => {
			const event = { params, platform, locals: {} } as any;
			await expect(server.DELETE(event)).rejects.toMatchObject({ status: 401 });
		});

		it('returns 500 if platform missing', async () => {
			const event = { params, platform: undefined, locals } as any;
			await expect(server.DELETE(event)).rejects.toMatchObject({ status: 500 });
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
			await expect(server.DELETE(event)).rejects.toMatchObject({ status: 500 });
		});
	});
});
