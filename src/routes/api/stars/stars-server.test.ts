import { vi, describe, it, expect, beforeEach } from 'vitest';
import { readResponseBody } from '$lib/test-utils.js';

let mockBucket: any = {};

vi.mock('$lib/r2.js', () => ({
  getR2Bucket: () => mockBucket,
}));

import { GET } from './+server.js';

describe('GET /api/stars', () => {
  let platform: any;
  let locals: any;

  beforeEach(() => {
    mockBucket = {
      list: vi.fn(),
    };
    platform = { some: 'platform' };
    locals = { userId: 'user123' };
  });

  it('returns 401 if unauthenticated', async () => {
    const event = { platform, locals: {} } as any;
    await expect(GET(event)).rejects.toMatchObject({ status: 401 });
  });

  it('returns 500 if platform missing', async () => {
    const event = { platform: undefined, locals } as any;
    await expect(GET(event)).rejects.toMatchObject({ status: 500 });
  });

  it('returns 200 and array of stars for authenticated user', async () => {
    mockBucket.list.mockResolvedValueOnce({
      objects: [
        { key: 'stars/user123/star1' },
        { key: 'stars/user123/star2' },
      ],
      truncated: false,
    });

    const event = { platform, locals } as any;
    const response = await GET(event);
    expect(response.status).toBe(200);

    const bodyData = await readResponseBody(response.body!);
    expect(Array.isArray(bodyData)).toBe(true);
    expect(bodyData).toEqual([{ id: 'star1' }, { id: 'star2' }]);
  });

  it('returns 500 on R2 error', async () => {
    mockBucket.list.mockRejectedValueOnce(new Error('R2 failure'));
    const event = { platform, locals } as any;
    await expect(GET(event)).rejects.toMatchObject({ status: 500 });
  });
});
