import { createClient } from 'npm:@supabase/supabase-js@2';
import { createAccountDeletionHandler } from '../_shared/accountDeletionHandler.ts';

const noSessionAuth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } as const;

const handler = createAccountDeletionHandler({
  getEnv: (name) => Deno.env.get(name),
  createUserClient: ({ supabaseUrl, publishableKey, authorization }) => createClient(supabaseUrl, publishableKey, {
    auth: noSessionAuth,
    global: { headers: { Authorization: authorization } },
  }),
  createReauthClient: ({ supabaseUrl, publishableKey }) => createClient(supabaseUrl, publishableKey, { auth: noSessionAuth }),
  createAdminClient: ({ supabaseUrl, serviceRoleKey }) => createClient(supabaseUrl, serviceRoleKey, { auth: noSessionAuth }),
});

Deno.serve(handler);
