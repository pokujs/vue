import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { AsyncPipeline } from '../shared/scenarios.js';
import { afterEach, expect, test } from 'vitest';

afterEach(cleanup);

test('handles async mounted updates and queued state transitions', async () => {
  render(AsyncPipeline);

  const heading = await screen.findByRole('heading', {
    level: 2,
    name: 'Loaded from async setup',
  });
  expect(heading.textContent).toBe('Loaded from async setup');

  expect(screen.getByLabelText('urgent-state').textContent).toBe('idle');
  expect(screen.getByLabelText('deferred-state').textContent).toBe('idle');

  await fireEvent.click(screen.getByRole('button', { name: 'Run pipeline' }));

  await screen.findByText('urgent-updated');
  await screen.findByText('queued-updated');

  expect(screen.getByLabelText('urgent-state').textContent).toBe(
    'urgent-updated'
  );
  expect(screen.getByLabelText('deferred-state').textContent).toBe(
    'queued-updated'
  );
});
