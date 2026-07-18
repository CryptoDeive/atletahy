export const ACCOUNT_DELETION_CONFIRMATION = 'ELIMINAR MI CUENTA';
const MAX_PASSWORD_LENGTH = 256;

type AuthUser = { id: string; email?: string | null };
type UserClient = { auth: { getUser: () => Promise<{ data: { user: AuthUser | null }; error: unknown }> } };
type ReauthClient = { auth: { signInWithPassword: (credentials: { email: string; password: string }) => Promise<{ data: { user: AuthUser | null }; error: unknown }> } };
type AdminClient = { auth: { admin: { deleteUser: (userId: string, shouldSoftDelete: boolean) => Promise<{ data: unknown; error: unknown }> } } };

type HandlerDependencies = {
  getEnv: (name: string) => string | undefined;
  createUserClient: (input: { supabaseUrl: string; publishableKey: string; authorization: string }) => UserClient;
  createReauthClient: (input: { supabaseUrl: string; publishableKey: string }) => ReauthClient;
  createAdminClient: (input: { supabaseUrl: string; serviceRoleKey: string }) => AdminClient;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function publishableKey(getEnv: HandlerDependencies['getEnv']) {
  return getEnv('SUPABASE_ANON_KEY') ?? getEnv('SUPABASE_PUBLISHABLE_KEY');
}

function corsHeaders(origin: string | null, allowedOrigin: string | undefined) {
  return {
    ...(origin && allowedOrigin && origin === allowedOrigin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

function jsonResponse(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

function validBody(value: unknown): value is { confirmation: string; currentPassword: string } {
  if (!isRecord(value) || Object.keys(value).length !== 2) return false;
  return typeof value.confirmation === 'string'
    && typeof value.currentPassword === 'string'
    && value.currentPassword.length > 0
    && value.currentPassword.length <= MAX_PASSWORD_LENGTH;
}

/**
 * Destructive account deletion boundary. The caller must prove its current
 * password immediately before the admin client is constructed.
 */
export function createAccountDeletionHandler(dependencies: HandlerDependencies) {
  return async function handleAccountDeletion(req: Request) {
    const origin = req.headers.get('Origin');
    const allowedOrigin = dependencies.getEnv('ACCOUNT_DELETION_ALLOWED_ORIGIN')?.trim();
    const headers = corsHeaders(origin, allowedOrigin);

    if (origin && (!allowedOrigin || origin !== allowedOrigin)) {
      return jsonResponse({ code: 'ORIGIN_NOT_ALLOWED', error: 'Origen no permitido.' }, 403, headers);
    }
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return jsonResponse({ code: 'METHOD_NOT_ALLOWED', error: 'Método no permitido.' }, 405, headers);

    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return jsonResponse({ code: 'AUTH_REQUIRED', error: 'Sesión requerida.' }, 401, headers);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ code: 'INVALID_INPUT', error: 'JSON inválido.' }, 400, headers);
    }
    if (!validBody(body)) return jsonResponse({ code: 'INVALID_INPUT', error: 'Solicitud inválida.' }, 400, headers);
    if (body.confirmation !== ACCOUNT_DELETION_CONFIRMATION) {
      return jsonResponse({ code: 'CONFIRMATION_REQUIRED', error: 'Confirmación exacta requerida.' }, 400, headers);
    }

    const supabaseUrl = dependencies.getEnv('SUPABASE_URL');
    const publicKey = publishableKey(dependencies.getEnv);
    const serviceRoleKey = dependencies.getEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !publicKey || !serviceRoleKey || !allowedOrigin) {
      return jsonResponse({ code: 'SERVICE_NOT_CONFIGURED', error: 'Servicio no configurado.' }, 500, headers);
    }

    let user: AuthUser | null = null;
    try {
      const scopedClient = dependencies.createUserClient({ supabaseUrl, publishableKey: publicKey, authorization });
      const result = await scopedClient.auth.getUser();
      if (!result.error) user = result.data.user;
    } catch {
      // Return only a stable public error below.
    }
    if (!user?.id || !user.email) return jsonResponse({ code: 'AUTH_REQUIRED', error: 'Sesión no válida.' }, 401, headers);

    let reauthenticatedUser: AuthUser | null = null;
    try {
      const reauthClient = dependencies.createReauthClient({ supabaseUrl, publishableKey: publicKey });
      const result = await reauthClient.auth.signInWithPassword({ email: user.email, password: body.currentPassword });
      if (!result.error) reauthenticatedUser = result.data.user;
    } catch {
      // Credentials and provider errors are deliberately not exposed.
    }
    if (reauthenticatedUser?.id !== user.id) {
      return jsonResponse({ code: 'REAUTHENTICATION_REQUIRED', error: 'No se pudo verificar de nuevo la identidad.' }, 403, headers);
    }

    try {
      // The privileged client is created only after caller auth + explicit reauth.
      const adminClient = dependencies.createAdminClient({ supabaseUrl, serviceRoleKey });
      const deletion = await adminClient.auth.admin.deleteUser(user.id, false);
      if (deletion.error) return jsonResponse({ code: 'ACCOUNT_DELETION_FAILED', error: 'No se pudo eliminar la cuenta.' }, 500, headers);
    } catch {
      return jsonResponse({ code: 'ACCOUNT_DELETION_FAILED', error: 'No se pudo eliminar la cuenta.' }, 500, headers);
    }

    return jsonResponse({ code: 'ACCOUNT_DELETED', deleted: true }, 200, headers);
  };
}
