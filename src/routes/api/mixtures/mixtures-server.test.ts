import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readResponseBody } from '$lib/test-utils.js';

let mockBucket: any = {};

vi.mock('$lib/r2.js', () => ({
  getR2Bucket: () => mockBucket,
}));

vi.mock('./r2-mx-utils', () => ({
  readMixtureObject: vi.fn(),
}));

import { GET } from './+server.js';

describe('GET /api/mixtures', () => {
  let platform: any;
  let locals: any;
  let mockReadMixtureObject: any;

  beforeEach(async () => {
    mockBucket = {
      list: vi.fn(),
    };
    platform = { some: 'platform' };
    locals = { userId: 'user123' };

    // Get the mocked function
    const { readMixtureObject } = await import('./r2-mx-utils.js');
    mockReadMixtureObject = readMixtureObject as any;
    mockReadMixtureObject.mockReset();
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
    // Setup mocks
    mockBucket.list.mockResolvedValueOnce({
      objects: [{ key: 'files/user123/file1' }, { key: 'files/user123/file2' }],
      truncated: false,
    });
    const mockFileData = { success: true, data: { id: 'file1' } };
    mockReadMixtureObject.mockResolvedValue(mockFileData);

    const event = { platform, locals } as any;
    const response = await GET(event);
    expect(response.status).toBe(200);

    const bodyData = await readResponseBody(response.body!);
    expect(Array.isArray(bodyData)).toBe(true);
  });

  it('skips invalid or 404 objects', async () => {
    mockBucket.list.mockResolvedValueOnce({
      objects: [{ key: 'files/user123/file1' }, { key: 'files/user123/file2' }],
      truncated: false,
    });
    mockReadMixtureObject
      .mockResolvedValueOnce(404)
      .mockResolvedValueOnce({ success: false, error: { issues: [] } });

    const event = { platform, locals } as any;
    const response = await GET(event);
    expect(response.status).toBe(200);

    const bodyData = await readResponseBody(response.body!);
    expect(bodyData).toEqual([]);
  });

  it('returns 500 on R2 error', async () => {
    mockBucket.list.mockRejectedValueOnce(new Error('R2 failure'));
    const event = { platform, locals } as any;
    await expect(GET(event)).rejects.toHaveProperty('status', 500);
  });
});
