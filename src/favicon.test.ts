import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('favicon metadata', () => {
  it('publishes browser and touch icons from the public root', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    expect(html).toContain('rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"');
    expect(html).toContain('rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png"');
    expect(html).toContain('rel="apple-touch-icon" sizes="192x192" href="/favicon-192.png"');
  });
});
