import { afterEach, expect, test } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { ToggleHarness } from '../shared/scenarios.js';

afterEach(cleanup);

test('tests custom hooks through a component harness', async () => {
  render(ToggleHarness);

  expect(screen.getByLabelText('toggle-state').textContent).toBe('disabled');
  await fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
  expect(screen.getByLabelText('toggle-state').textContent).toBe('enabled');
});
