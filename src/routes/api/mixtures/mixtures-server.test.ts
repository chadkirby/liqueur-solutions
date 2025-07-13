import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readResponseBody } from '$lib/test-utils.js';

let mockDB: any = {};

vi.mock('$lib/cf-bindings.js', () => ({
  getDB: () => mockDB,
}));

import { GET } from './+server.js';

describe('GET /api/mixtures', () => {
  let platform: any;
  let locals: any;
  let mockPreparedStatement: any;
  let mockBoundStatement: any;

  beforeEach(() => {
    mockBoundStatement = {
      all: vi.fn(),
    };
    mockPreparedStatement = {
      bind: vi.fn().mockReturnValue(mockBoundStatement),
    };
    mockDB = {
      prepare: vi.fn().mockReturnValue(mockPreparedStatement),
    };
    platform = { some: 'platform' };
    locals = { userId: 'user123' };
  });

  it('returns 401 if unauthenticated', async () => {
    const event = { platform, locals: {} } as any;
    await expect(GET(event)).rejects.toHaveProperty('status', 401);
  });

  it('returns 500 if platform missing', async () => {
    const event = { platform: undefined, locals } as any;
    await expect(GET(event)).rejects.toHaveProperty('status', 500);
  });

  it('returns 200 and array of files for authenticated user', async () => {
    // Setup mocks - simulate D1 query results
    const mockResults = [
      {
        userid: 'user123',
        id: 'file1',
        name: 'Test Mixture 1',
        desc: 'Description 1',
        rootIngredientId: 'root1',
        updated: '2023-01-01T00:00:00.000Z',
        hash: 'hash1',
        starred: false,
      },
      {
        userid: 'user123',
        id: 'file2',
        name: 'Test Mixture 2',
        desc: 'Description 2',
        rootIngredientId: 'root2',
        updated: '2023-01-02T00:00:00.000Z',
        hash: 'hash2',
        starred: true,
      },
    ];
    mockBoundStatement.all.mockResolvedValueOnce({
      results: mockResults,
      success: true,
    });

    const event = { platform, locals } as any;
    const response = await GET(event);
    expect(response.status).toBe(200);

    const bodyData = await readResponseBody(response.body!);
    expect(Array.isArray(bodyData)).toBe(true);
    expect(bodyData).toHaveLength(2);
  });

  it('skips invalid data and returns valid mixtures', async () => {
    // Setup mocks - simulate D1 query results with invalid data
    const mockResults = [
      {
        userid: 'user123',
        id: 'file1',
        name: 'Valid Mixture',
        desc: 'Description',
        rootIngredientId: 'root1',
        updated: '2023-01-01T00:00:00.000Z',
        hash: 'hash1',
        starred: false,
      },
      {
        userid: 'user123',
        id: 'file2',
        // Missing required fields - will be invalid
        starred: false,
      },
    ];
    mockBoundStatement.all.mockResolvedValueOnce({
      results: mockResults,
      success: true,
    });

    const event = { platform, locals } as any;
    const response = await GET(event);
    expect(response.status).toBe(200);

    const bodyData = await readResponseBody(response.body!);
    expect(Array.isArray(bodyData)).toBe(true);
    expect(bodyData).toHaveLength(1); // Only the valid mixture
  });

  it('returns 500 on database error', async () => {
    mockBoundStatement.all.mockRejectedValueOnce(new Error('Database failure'));
    const event = { platform, locals } as any;
    await expect(GET(event)).rejects.toHaveProperty('status', 500);
  });
});
