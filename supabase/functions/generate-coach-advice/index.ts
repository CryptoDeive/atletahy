import { createClient } from 'npm:@supabase/supabase-js@2';
import { createCoachAdviceHandler } from '../_shared/coachAdviceHandler.ts';

const handler = createCoachAdviceHandler({
  getEnv: (name) => Deno.env.get(name),
  createSupabaseClient: ({ supabaseUrl, supabaseKey, authorization }) => createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  }),
});

Deno.serve(handler);
