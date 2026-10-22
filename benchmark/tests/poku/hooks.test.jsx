import { cleanup, fireEvent, render, screen } from '@pokujs/vue';
import { afterEach, assert, test } from 'poku';
import { ToggleHarness } from '../shared/scenarios.js';

afterEach(cleanup);

test('tests custom hooks through a component harness', async () => {
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
});
