import { afterEach, assert, test } from 'poku';
import CounterButton from './__fixtures__/CounterButton.vue';
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '../src/index.ts';

afterEach(cleanup);

test('renders and updates an SFC component', async () => {
  render(CounterButton, {
    props: { initialCount: 1 },
  });

  assert.strictEqual(
    screen.getByRole('heading', { name: 'Count: 1' }).textContent,
    'Count: 1'
  );

  await fireEvent.click(screen.getByRole('button', { name: 'Increment' }));

  assert.strictEqual(
    screen.getByRole('heading', { name: 'Count: 2' }).textContent,
    'Count: 2'
  );
});
