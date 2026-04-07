import { afterEach, assert, test } from 'poku';
import ToggleHarness from './__fixtures__/ToggleHarness.vue';
import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '../src/index.ts';
import { useToggle } from './helpers/use-toggle.ts';

afterEach(cleanup);

test('tests composables through SFC harness and renderHook', async () => {
  render(ToggleHarness);

  assert.strictEqual(
    screen.getByLabelText('toggle-state').textContent,
    'disabled'
  );

  await fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));

  assert.strictEqual(
    screen.getByLabelText('toggle-state').textContent,
    'enabled'
  );

  const { result } = renderHook(
    ({ initial }: { initial: boolean }) => useToggle(initial),
    {
      initialProps: { initial: true },
    }
  );

  assert.strictEqual(result.current.enabled.value, true);
});

test('renderHook.rerender keeps result.current live after destructuring', async () => {
  const { result, rerender } = renderHook(
    ({ value }: { value: string }) => value,
    {
      initialProps: { value: 'first' },
    }
  );

  assert.strictEqual(result.current, 'first');

  await rerender({ value: 'second' });

  assert.strictEqual(result.current, 'second');
});
