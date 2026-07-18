import { describe, expect, it, vi } from 'vitest';
import { ACCOUNT_DELETION_CONFIRMATION, createAccountDeletionHandler } from './accountDeletionHandler';

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://example.supabase.co/functions/v1/delete-account', {
    method: 'POST',
    headers: { Authorization: 'Bearer user-token', 'Content-Type': 'application/json', Origin: 'https://app.atletahy.test', ...headers },
    body: JSON.stringify(body),
  });
}

function setup(overrides: Record<string, unknown> = {}) {
  const deleteUser = vi.fn().mockResolvedValue({ data: {}, error: null });
  const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'athlete@example.com' } }, error: null });
  const env: Record<string, string> = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'publishable-test-key',
    SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-key',
    ACCOUNT_DELETION_ALLOWED_ORIGIN: 'https://app.atletahy.test',
  };
  const handler = createAccountDeletionHandler({
    getEnv: (name) => env[name],
    createUserClient: vi.fn(() => ({ auth: { getUser } })),
    createReauthClient: vi.fn(() => ({ auth: { signInWithPassword } })),
    createAdminClient: vi.fn(() => ({ auth: { admin: { deleteUser } } })),
    ...overrides,
  });
  return { handler, deleteUser, signInWithPassword, getUser };
}

const validBody = { confirmation: ACCOUNT_DELETION_CONFIRMATION, currentPassword: 'correct horse battery staple' };

describe('account deletion handler', () => {
  it('answers preflight only for the configured origin', async () => {
    const { handler } = setup();
    const response = await handler(new Request('https://example.supabase.co/functions/v1/delete-account', {
      method: 'OPTIONS',
      headers: { Origin: 'https://app.atletahy.test' },
    }));

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.atletahy.test');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
  });

  it('requires bearer auth, an exact confirmation and the configured browser origin', async () => {
    const { handler, deleteUser } = setup();
    const noAuth = await handler(new Request('https://example.test', { method: 'POST', headers: { Origin: 'https://app.atletahy.test' }, body: JSON.stringify(validBody) }));
    expect(noAuth.status).toBe(401);
    expect((await noAuth.json()).code).toBe('AUTH_REQUIRED');

    const wrongPhrase = await handler(request({ ...validBody, confirmation: 'eliminar' }));
    expect(wrongPhrase.status).toBe(400);
    expect((await wrongPhrase.json()).code).toBe('CONFIRMATION_REQUIRED');

    const wrongOrigin = await handler(request(validBody, { Origin: 'https://evil.example' }));
    expect(wrongOrigin.status).toBe(403);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('reauthenticates explicitly and never reaches admin deletion on failure', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: null }, error: { code: 'invalid_credentials' } });
    const { handler, deleteUser } = setup({ createReauthClient: vi.fn(() => ({ auth: { signInWithPassword } })) });

    const response = await handler(request(validBody));

    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe('REAUTHENTICATION_REQUIRED');
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'athlete@example.com', password: validBody.currentPassword });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('deletes only the authenticated and reauthenticated user with server-only privileges', async () => {
    const createAdminClient = vi.fn(() => ({ auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ data: {}, error: null }) } } }));
    const { handler } = setup({ createAdminClient });

    const response = await handler(request(validBody));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ code: 'ACCOUNT_DELETED', deleted: true });
    expect(createAdminClient).toHaveBeenCalledWith({ supabaseUrl: 'https://example.supabase.co', serviceRoleKey: 'server-only-test-key' });
    const admin = createAdminClient.mock.results[0].value;
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith('user-1', false);
  });

  it('fails explicitly and safely when privileged deletion fails', async () => {
    const deleteUser = vi.fn().mockResolvedValue({ data: null, error: { message: 'internal details', stack: 'secret stack' } });
    const { handler } = setup({ createAdminClient: vi.fn(() => ({ auth: { admin: { deleteUser } } })) });

    const response = await handler(request(validBody));
    const serialized = JSON.stringify(await response.json());

    expect(response.status).toBe(500);
    expect(serialized).toContain('ACCOUNT_DELETION_FAILED');
    expect(serialized).not.toContain('internal details');
    expect(serialized).not.toContain('secret stack');
  });
});
