import { afterEach, assert, test } from 'poku';
import { cleanup, render, screen } from '@pokujs/vue';
import { GreetingCard, createUnmountWatcher } from '../shared/scenarios.js';

afterEach(cleanup);

await test('rerender updates component props in place', async () => {
  const view = render(GreetingCard, {
    props: { name: 'Ada' },
  });

  assert.strictEqual(
    screen.getByRole('heading', { level: 3 }).textContent,
    'Hello Ada'
  );
  await view.rerender(GreetingCard, {
    props: { name: 'Grace' },
  });
  assert.strictEqual(
    screen.getByRole('heading', { level: 3 }).textContent,
    'Hello Grace'
  );
});

await test('unmount runs effect cleanup logic', async () => {
  let cleaned = false;

  const view = render(createUnmountWatcher(() => {
    cleaned = true;
  }));
  assert.strictEqual(cleaned, false);

  view.unmount();
  assert.strictEqual(cleaned, true);
});
