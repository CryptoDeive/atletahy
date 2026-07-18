import { createClient } from 'npm:@supabase/supabase-js@2';
import { createTrainingPlanHandler } from '../_shared/trainingPlanHandler.ts';

const handler = createTrainingPlanHandler({
  getEnv: (name) => Deno.env.get(name),
  createSupabaseClient: ({ supabaseUrl, supabaseKey, authorization }) => createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  }),
});

Deno.serve(handler);
