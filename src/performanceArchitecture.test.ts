import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('performance architecture', () => {
  it('loads route-level and AI screens lazily behind accessible suspense fallbacks', () => {
    const appSource = projectFile('src/App.tsx');
    const trainingDaySource = projectFile('src/components/TrainingDayView.tsx');

    for (const screen of ['AccountView', 'TestsView', 'OnboardingView', 'PlanGeneratorPanel']) {
      expect(appSource).toMatch(new RegExp(`lazy\\(\\(\\) => import\\(.+${screen}`));
    }
    expect(appSource).toContain('Suspense');
    expect(trainingDaySource).toMatch(/lazy\(\(\) => import\(.+CoachAdvicePanel/);
    expect(trainingDaySource).toContain('Suspense');
    expect(`${appSource}\n${trainingDaySource}`).toContain('role="status"');
  });

  it('uses device fonts without third-party font requests or blocking CSS imports', () => {
    const cssSource = projectFile('src/index.css');
    const htmlSource = projectFile('index.html');

    expect(cssSource).not.toMatch(/@import\s+url\([^)]*fonts\.googleapis\.com/);
    expect(htmlSource).not.toContain('fonts.googleapis.com');
    expect(htmlSource).not.toContain('fonts.gstatic.com');
  });

  it('keeps third-party dependencies in one cacheable vendor chunk', () => {
    const viteSource = projectFile('vite.config.ts');

    expect(viteSource).toContain("name: 'vendor'");
    expect(viteSource).toMatch(/test:\s*\/node_modules\//);
  });
});
