import { afterEach, describe, expect, it, vi } from 'vitest';

describe('supabaseClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('does not configure Supabase when env vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const { isSupabaseConfigured, supabase } = await import('./supabaseClient');

    expect(isSupabaseConfigured).toBe(false);
    expect(supabase).toBeNull();
  });

  it('configures Supabase when URL and anon key are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://baaolluzteatewpenojo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-test-key');

    const { isSupabaseConfigured, supabase } = await import('./supabaseClient');

    expect(isSupabaseConfigured).toBe(true);
    expect(supabase).not.toBeNull();
  });
});
