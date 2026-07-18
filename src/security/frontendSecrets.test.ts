import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = join(directory, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) return collectSourceFiles(path);
      if (/\.(ts|tsx|js|jsx)$/.test(entry)) return [path];
      return [];
    });
}

describe('frontend secret hygiene', () => {
  it('does not reference the server OpenAI secret in frontend source files', () => {
    const forbiddenServerSecretName = ['OPENAI', 'API', 'KEY'].join('_');
    const offenders = collectSourceFiles(join(process.cwd(), 'src')).filter((file) => !file.endsWith('.test.ts') && !file.endsWith('.test.tsx') && readFileSync(file, 'utf8').includes(forbiddenServerSecretName));

    expect(offenders).toEqual([]);
  });
});
