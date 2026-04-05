import { afterEach, assert, test } from 'poku';
import GreetingCard from './__fixtures__/GreetingCard.vue';
import UnmountWatcher from './__fixtures__/UnmountWatcher.vue';
import {
  cleanup,
  render,
  screen,
} from '../src/index.ts';

afterEach(cleanup);

test('rerender updates props and unmount lifecycle callbacks fire', async () => {
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

  let cleaned = false;

  const lifecycleView = render(UnmountWatcher, {
    props: {
      onCleanup: () => {
        cleaned = true;
      },
    },
  });

  assert.strictEqual(cleaned, false);
  lifecycleView.unmount();
  assert.strictEqual(cleaned, true);
});
