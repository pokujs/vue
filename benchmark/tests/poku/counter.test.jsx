import { afterEach, assert, test } from 'poku';
import { cleanup, fireEvent, render, screen } from '@pokujs/vue';
import { CounterButton } from '../shared/scenarios.js';

afterEach(cleanup);

test('renders and updates a Vue component', async () => {
  render(CounterButton, {
    props: { initialCount: 1 },
  });

  assert.strictEqual(
    screen.getByRole('heading', { name: 'Count: 1' }).textContent,
    'Count: 1'
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Increment' }));
  assert.strictEqual(screen.getByRole('heading').textContent, 'Count: 2');
});
