import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

afterEach(() => {
  window.history.replaceState({}, '', '/');
  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith('atletahy:') && key.endsWith(':onboarding-draft')) {
      window.sessionStorage.removeItem(key);
    }
  }
});
