import { cleanup, render, screen } from '@testing-library/vue';
import { afterEach, expect, test } from 'vitest';
import { themeKey, ThemeLabel } from '../shared/scenarios.js';

afterEach(cleanup);

test('injects context values via wrapper', () => {
  render(ThemeLabel, {
    global: {
      provide: {
        [themeKey]: 'dark',
      },
    },
  });

  expect(screen.getByText('Theme: dark').textContent).toBe('Theme: dark');
});
