import { describe, expect, it } from 'vitest';
import { readRemote } from './remoteResult';

describe('RemoteResult', () => {
  it('distinguishes found and absent values', async () => {
    await expect(readRemote(async () => ({ id: '1' }), (value) => value !== null)).resolves.toEqual({ ok: true, found: true, value: { id: '1' } });
    await expect(readRemote(async () => null, (value) => value !== null)).resolves.toEqual({ ok: true, found: false });
  });

  it('classifies authorization, session and network errors without returning local data', async () => {
    await expect(readRemote(async () => { throw { status: 401 }; }, () => true)).resolves.toMatchObject({ ok: false, kind: 'session' });
    await expect(readRemote(async () => { throw { status: 403 }; }, () => true)).resolves.toMatchObject({ ok: false, kind: 'authorization' });
    await expect(readRemote(async () => { throw new TypeError('Failed to fetch'); }, () => true)).resolves.toMatchObject({ ok: false, kind: 'network' });
  });
});
