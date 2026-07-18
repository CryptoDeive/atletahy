export const LEGAL_VERSION = '2026-07-18';

export interface ConsentChoices {
  healthData: boolean;
  healthDataWithAi: boolean;
}

export interface ConsentRecord extends ConsentChoices {
  policyVersion: string;
  recordedAt: string;
}

export function buildSignupLegalMetadata(acceptedAt = new Date().toISOString()) {
  return {
    adult_declaration: true,
    legal_terms_accepted: true,
    legal_version: LEGAL_VERSION,
    legal_accepted_at: acceptedAt,
  } as const;
}

export function buildConsentRecord(choices: ConsentChoices, recordedAt = new Date().toISOString()): ConsentRecord {
  return {
    policyVersion: LEGAL_VERSION,
    healthData: choices.healthData,
    healthDataWithAi: choices.healthData && choices.healthDataWithAi,
    recordedAt,
  };
}

export function canUseHealthDataWithAi(record: ConsentRecord | null | undefined) {
  return Boolean(record?.healthData && record.healthDataWithAi && record.policyVersion === LEGAL_VERSION);
}
