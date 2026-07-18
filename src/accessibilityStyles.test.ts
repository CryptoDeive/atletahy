import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('global accessibility styles', () => {
  it('keeps the skip link hidden until focused and honors reduced motion', () => {
    const css = readFileSync(`${process.cwd()}/src/index.css`, 'utf8');
    expect(css).toContain('.skip-link');
    expect(css).toContain('.skip-link:focus-visible');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('avoids low-contrast muted text in primary content', () => {
    const files = [
      'components/DayCard.tsx',
      'components/WeeklyDashboard.tsx',
      'components/WeekCalendarPicker.tsx',
      'components/plans/GeneratedPlanView.tsx',
      'components/tests/TestDetailView.tsx',
      'components/tests/TestsView.tsx',
      'components/tests/TestResultForm.tsx',
    ];
    for (const file of files) {
      const source = readFileSync(`${process.cwd()}/src/${file}`, 'utf8');
      expect(source).not.toMatch(/text-white\/(30|35|40|45)(?!\d)/);
    }
  });
});
