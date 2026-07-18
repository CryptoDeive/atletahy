import { describe, expect, it } from 'vitest';
import { extractResponsesApiText, isAbortError } from './trainingPlanResponse';

describe('extractResponsesApiText', () => {
  it('prefers output_text when available', () => {
    expect(extractResponsesApiText({ output_text: '  {"ok":true}  ' })).toBe('{"ok":true}');
  });

  it('falls back to output content text chunks', () => {
    expect(extractResponsesApiText({
      output: [
        { content: [{ text: ' {"first":1}' }, { text: ' {"second":2} ' }] },
      ],
    })).toBe('{"first":1}\n{"second":2}');
  });

  it('returns null when there is no text output', () => {
    expect(extractResponsesApiText({ output: [{ content: [{ type: 'refusal' }] }] })).toBeNull();
  });
});

describe('isAbortError', () => {
  it('detects DOM AbortError objects', () => {
    expect(isAbortError(new DOMException('Timed out', 'AbortError'))).toBe(true);
    expect(isAbortError(new Error('other'))).toBe(false);
  });
});
