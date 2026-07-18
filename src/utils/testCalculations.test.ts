import { describe, expect, it } from 'vitest';
import {
  calculateAverageSpeedKmh,
  calculateEstimatedFtp,
  calculatePacePer500m,
  calculatePacePerKm,
  calculateVam,
  parseDurationToSeconds,
} from './testCalculations';

describe('testCalculations', () => {
  it('parses simple and extended duration formats', () => {
    expect(parseDurationToSeconds('7:39')).toBe(459);
    expect(parseDurationToSeconds('1:02:15')).toBe(3735);
    expect(parseDurationToSeconds('00:01:30.5')).toBe(90.5);
  });

  it('calculates pace per 500 metres', () => {
    expect(calculatePacePer500m(480, 2000)).toBe(120);
  });

  it('calculates pace per kilometre', () => {
    expect(calculatePacePerKm(2400, 10000)).toBe(240);
  });

  it('calculates FTP at 95 percent', () => {
    expect(calculateEstimatedFtp(300)).toBe(285);
  });

  it('calculates VAM from distance and time', () => {
    expect(calculateVam(3000, 720)).toBe(15);
  });

  it('avoids division by zero and invalid durations', () => {
    expect(calculateAverageSpeedKmh(2000, 0)).toBeNull();
    expect(calculatePacePer500m(0, 2000)).toBeNull();
    expect(calculateVam(0, 720)).toBeNull();
    expect(parseDurationToSeconds('not-a-time')).toBeNull();
  });
});
