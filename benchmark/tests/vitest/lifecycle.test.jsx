import { cleanup, render, screen } from '@testing-library/vue';
import { GreetingCard, createUnmountWatcher } from '../shared/scenarios.js';
import { afterEach, expect, test } from 'vitest';

afterEach(cleanup);

test('rerender updates component props in place', async () => {
  const view = render(GreetingCard, {
    props: { name: 'Ada' },
  });

  expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(
    'Hello Ada'
  );
  await view.rerender({ name: 'Grace' });
  expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(
    'Hello Grace'
  );
});

test('unmount runs effect cleanup logic', () => {
  let cleaned = false;

  const view = render(createUnmountWatcher(() => {
    cleaned = true;
  }));
  expect(cleaned).toBe(false);

  view.unmount();
  expect(cleaned).toBe(true);
});
