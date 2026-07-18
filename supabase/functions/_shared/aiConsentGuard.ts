export const CURRENT_LEGAL_POLICY_VERSION = '2026-07-18';

type ConsentRpcClient = {
  rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export async function hasCurrentAiHealthConsent(client: ConsentRpcClient): Promise<boolean> {
  try {
    const result = await client.rpc('has_current_ai_health_consent', { p_policy_version: CURRENT_LEGAL_POLICY_VERSION });
    return !result.error && result.data === true;
  } catch {
    return false;
  }
}
