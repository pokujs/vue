import { afterEach, assert, test } from 'poku';
import AsyncPipeline from './__fixtures__/AsyncPipeline.vue';
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '../src/index.ts';

afterEach(cleanup);

test('handles async mounted updates and queued state transitions', async () => {
  render(AsyncPipeline);

  const heading = await screen.findByRole('heading', {
    level: 2,
    name: 'Loaded from async setup',
  });
  assert.strictEqual(heading.textContent, 'Loaded from async setup');

  assert.strictEqual(screen.getByLabelText('urgent-state').textContent, 'idle');
  assert.strictEqual(
    screen.getByLabelText('deferred-state').textContent,
    'idle'
  );

  await fireEvent.click(screen.getByRole('button', { name: 'Run pipeline' }));

  await screen.findByText('urgent-updated');
  await screen.findByText('queued-updated');

  assert.strictEqual(
    screen.getByLabelText('urgent-state').textContent,
    'urgent-updated'
  );
  assert.strictEqual(
    screen.getByLabelText('deferred-state').textContent,
    'queued-updated'
  );
});
