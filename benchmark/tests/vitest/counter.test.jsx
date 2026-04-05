import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { CounterButton } from '../shared/scenarios.js';
import { afterEach, expect, test } from 'vitest';

afterEach(cleanup);

test('renders and updates a Vue component', async () => {
  render(CounterButton, {
    props: { initialCount: 1 },
  });

  expect(screen.getByRole('heading', { name: 'Count: 1' }).textContent).toBe(
    'Count: 1'
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Increment' }));
  expect(screen.getByRole('heading').textContent).toBe('Count: 2');
});
