import { afterEach, expect, test } from '@jest/globals';
import { cleanup, render, screen } from '@testing-library/vue';
import { ThemeLabel, themeKey } from '../shared/scenarios.js';

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
