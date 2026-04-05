import {
  computed,
  defineComponent,
  h,
  inject,
  onMounted,
  onUnmounted,
  provide,
  ref,
} from 'vue';

export const themeKey = 'poku.theme';

export const CounterButton = defineComponent({
  name: 'CounterButton',
  props: {
    initialCount: {
      type: Number,
      default: 0,
    },
  },
  setup(props) {
    const count = ref(props.initialCount);

    const increment = () => {
      count.value += 1;
    };

    return () =>
      h('section', [
        h('h1', `Count: ${count.value}`),
        h('button', { type: 'button', onClick: increment }, 'Increment'),
      ]);
  },
});

export const ToggleHarness = defineComponent({
  name: 'ToggleHarness',
  setup() {
    const enabledValue = ref(false);
    const enabled = computed(() => enabledValue.value);

    const toggle = () => {
      enabledValue.value = !enabledValue.value;
    };

    return () =>
      h('div', [
        h(
          'output',
          { 'aria-label': 'toggle-state' },
          enabled.value ? 'enabled' : 'disabled'
        ),
        h('button', { type: 'button', onClick: toggle }, 'Toggle'),
      ]);
  },
});

export const GreetingCard = defineComponent({
  name: 'GreetingCard',
  props: {
    name: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    return () => h('h3', `Hello ${props.name}`);
  },
});

export const createUnmountWatcher = (onCleanup) =>
  defineComponent({
    name: 'UnmountWatcher',
    setup() {
      onUnmounted(() => {
        onCleanup();
      });

      return () => h('span', 'Mounted');
    },
  });

export const ThemeLabel = defineComponent({
  name: 'ThemeLabel',
  setup() {
    const theme = inject(themeKey, 'light');
    return () => h('p', `Theme: ${theme}`);
  },
});

export const ThemeWrapper = defineComponent({
  name: 'ThemeWrapper',
  setup(_, { slots }) {
    provide(themeKey, 'dark');
    return () => slots.default?.() ?? [];
  },
});

export const AsyncPipeline = defineComponent({
  name: 'AsyncPipeline',
  setup() {
    const message = ref('Loading...');
    const urgentState = ref('idle');
    const deferredState = ref('idle');

    onMounted(async () => {
      await Promise.resolve();
      message.value = 'Loaded from async setup';
    });

    const runPipeline = () => {
      urgentState.value = 'urgent-updated';
      queueMicrotask(() => {
        deferredState.value = 'queued-updated';
      });
    };

    return () =>
      h('section', [
        h('h2', message.value),
        h('button', { type: 'button', onClick: runPipeline }, 'Run pipeline'),
        h('output', { 'aria-label': 'urgent-state' }, urgentState.value),
        h('output', { 'aria-label': 'deferred-state' }, deferredState.value),
      ]);
  },
});