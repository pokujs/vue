import { afterEach, assert, test } from 'poku';
import { cleanup, render, screen } from '@pokujs/vue';
import { ThemeLabel, ThemeWrapper } from '../shared/scenarios.js';

afterEach(cleanup);

test('injects context values via wrapper', async () => {
  render(ThemeLabel, { wrapper: ThemeWrapper });

  assert.strictEqual(
    screen.getByText('Theme: dark').textContent,
    'Theme: dark'
  );
});
