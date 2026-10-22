import { afterEach, assert, test } from 'poku';
import { cleanup, render, screen } from '../src/index.ts';
import ThemeLabel from './__fixtures__/ThemeLabel.vue';
import ThemeWrapper from './__fixtures__/ThemeWrapper.vue';

afterEach(cleanup);

test('injects provided values through an SFC wrapper', async () => {
  render(ThemeLabel, {
    wrapper: ThemeWrapper,
  });

  assert.strictEqual(
    screen.getByText('Theme: dark').textContent,
    'Theme: dark'
  );
});
