import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const functionPath = join(process.cwd(), 'supabase/functions/generate-coach-advice/index.ts');
const handlerPath = join(process.cwd(), 'supabase/functions/_shared/coachAdviceHandler.ts');

describe('generate-coach-advice Edge Function', () => {
  it('contains CORS handling and OPTIONS support', () => {
    expect(existsSync(functionPath)).toBe(true);

    const source = readFileSync(handlerPath, 'utf8');
    expect(source).toMatch(/Access-Control-Allow-Origin/);
    expect(source).toMatch(/OPTIONS/);
    expect(source).toMatch(/POST/);
  });

  it('requires an Authorization Bearer JWT and verifies it with supabase.auth.getUser()', () => {
    const source = readFileSync(functionPath, 'utf8') + readFileSync(handlerPath, 'utf8');

    expect(source).toMatch(/headers\.get\(['"]Authorization['"]\)/);
    expect(source).toMatch(/startsWith\(['"]Bearer\s['"]\)/);
    expect(source).toMatch(/global:\s*\{\s*headers:\s*\{\s*Authorization:\s*authorization\s*\}\s*\}/s);
    expect(source).toMatch(/client\.auth\.getUser\(\)/);
    expect(source).toMatch(/auth\.error\s*\|\|\s*!auth\.data\.user/);
  });

  it('reads the OpenAI key from Deno.env and never exposes the secret', () => {
    const source = readFileSync(functionPath, 'utf8') + readFileSync(handlerPath, 'utf8');
    const jsonResponseStatements = source.match(/(?:return\s+)?jsonResponse\([^;\n]+/g) ?? [];

    expect(source).toMatch(/Deno\.env\.get\(name\)/);
    expect(source).toMatch(/Authorization:\s*`Bearer\s*\$\{openAiKey\}`/);
    expect(jsonResponseStatements.join('\n')).not.toMatch(/openAiKey|OPENAI_API_KEY/);
    expect(source).not.toMatch(/JSON\.stringify\([^)]*(openAiKey|OPENAI_API_KEY)/);
    expect(source).not.toMatch(/console\.(log|error|warn)\(/);
  });

  it('validates OpenAI output through the CoachAdvice schema helper before responding', () => {
    const source = readFileSync(handlerPath, 'utf8');

    expect(source).toMatch(/validateCoachAdvice/);
    expect(source).toMatch(/const\s+validation\s*=\s*validateCoachAdvice\(safe\)/);
    expect(source).toMatch(/advice:\s*validation\.advice/);
  });

  it('does not contain logging statements or input/auth logging', () => {
    const source = readFileSync(functionPath, 'utf8') + readFileSync(handlerPath, 'utf8');

    expect(source).not.toMatch(/console\.(log|error|warn)\(/);
    expect(source).not.toMatch(/console\.[\s\S]*(input|authorization|auth|token|jwt|openAiKey|OPENAI_API_KEY)/i);
  });
});
