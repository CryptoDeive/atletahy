import { describe, expect, it } from 'vitest';
import { buildConsentRecord, buildSignupLegalMetadata, canUseHealthDataWithAi, LEGAL_VERSION } from './consent';
describe('legal consent records', () => {
  it('creates a versioned, timestamped and granular record', () => {
    const record = buildConsentRecord({ healthData: true, healthDataWithAi: false }, '2026-07-18T12:00:00.000Z');

    expect(record).toEqual({
      policyVersion: LEGAL_VERSION,
      healthData: true,
      healthDataWithAi: false,
      recordedAt: '2026-07-18T12:00:00.000Z',
    });
  });

  it('builds immutable signup evidence fields for the database trigger', () => {
    expect(buildSignupLegalMetadata('2026-07-18T12:00:00.000Z')).toEqual({
      adult_declaration: true,
      legal_terms_accepted: true,
      legal_version: LEGAL_VERSION,
      legal_accepted_at: '2026-07-18T12:00:00.000Z',
    });
  });

  it('never allows AI health processing without both consents', () => {
    expect(canUseHealthDataWithAi(buildConsentRecord({ healthData: true, healthDataWithAi: true }))).toBe(true);
    expect(canUseHealthDataWithAi(buildConsentRecord({ healthData: true, healthDataWithAi: false }))).toBe(false);
    expect(canUseHealthDataWithAi(buildConsentRecord({ healthData: false, healthDataWithAi: true }))).toBe(false);
  });
});
