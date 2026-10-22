import { afterEach, assert, test } from 'poku';
import { defineComponent, h, inject } from 'vue';
import { cleanup, fireEvent, render, screen } from '../src/index.ts';
import CounterButton from './__fixtures__/CounterButton.vue';

afterEach(cleanup);

test('renders and updates an SFC component', async () => {
  const view = render(CounterButton, {
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

  assert.strictEqual(
    view.asFragment().querySelector('button')?.textContent?.trim(),
    'Increment'
  );
  assert.strictEqual(typeof screen.debug, 'function');
});

test('supports slots, global.provide, emitted(), and partial-props rerender()', async () => {
  const SlotAndEmitComp = defineComponent({
    props: {
      title: { type: String, required: true },
      subtitle: { type: String, default: 'default-sub' },
    },
    emits: ['action'],
    setup(props, { slots, emit }) {
      const providedTheme = inject('theme', 'light');
      return () =>
        h('section', { 'data-theme': providedTheme }, [
          h('h4', props.title),
          h('p', props.subtitle),
          slots.default ? slots.default() : null,
          h(
            'button',
            {
              type: 'button',
              onClick: () => emit('action', props.title),
            },
            'Run'
          ),
        ]);
    },
  });

  const view = render(SlotAndEmitComp, {
    props: { title: 'Initial', subtitle: 'Sub 1' },
    slots: { default: () => h('span', 'Slot Content') },
    global: { provide: { theme: 'dark' } },
  });

  assert.strictEqual(screen.getByText('Initial').textContent, 'Initial');
  assert.strictEqual(screen.getByText('Sub 1').textContent, 'Sub 1');
  assert.strictEqual(
    screen.getByText('Slot Content').textContent,
    'Slot Content'
  );

  await fireEvent.click(screen.getByRole('button', { name: 'Run' }));
  assert.deepStrictEqual(view.emitted('action'), [['Initial']]);

  // Partial props update via rerender(newProps) preserves existing component & other props
  await view.rerender({ title: 'Updated' });
  assert.strictEqual(screen.getByText('Updated').textContent, 'Updated');
  assert.strictEqual(screen.getByText('Sub 1').textContent, 'Sub 1');
});
