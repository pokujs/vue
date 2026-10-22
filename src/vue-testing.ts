import type {
  BoundFunctions,
  PrettyDOMOptions,
  Screen,
} from '@testing-library/dom';
import type {
  App,
  Component,
  Directive,
  FunctionalComponent,
  VNode,
  Plugin as VuePlugin,
} from 'vue';
import { createRequire } from 'node:module';
import {
  createAsFragment,
  createDebug,
  createRenderMetricsEmitter,
  createScopedRegistry,
  createScreen,
  createWaitFor,
  getNow,
  wrapFireEventMethods,
} from '@pokujs/dom';
import { getQueriesForElement, queries } from '@testing-library/dom';
import * as domTestingLibrary from '@testing-library/dom';
import { parseRuntimeOptions } from './runtime-options.ts';

type VueRuntimeModule = typeof import('vue');

let cachedVueRuntime: VueRuntimeModule | undefined;

const getVueRuntime = (): VueRuntimeModule => {
  if (!cachedVueRuntime) {
    const g = globalThis as typeof globalThis & {
      __VUE_DEVTOOLS_GLOBAL_HOOK__?: { enabled?: boolean; emit: () => void };
    };
    g.__VUE_DEVTOOLS_GLOBAL_HOOK__ ??= { enabled: false, emit() {} };
    const require = createRequire(import.meta.url);
    cachedVueRuntime = require('vue') as VueRuntimeModule;
  }

  return cachedVueRuntime;
};

type WrapperComponent = Component;
type VueRenderable = Component | VNode;
export type VueGlobalOptions = {
  plugins?: Array<VuePlugin | [VuePlugin, ...unknown[]]>;
  provide?: Record<PropertyKey, unknown>;
  components?: Record<string, Component>;
  directives?: Record<string, Directive>;
  config?: Partial<App['config']>;
};

type RenderBaseOptions = {
  container?: HTMLElement;
  baseElement?: HTMLElement;
  wrapper?: WrapperComponent;
  slots?: Record<string, unknown>;
  attrs?: Record<string, unknown>;
  global?: VueGlobalOptions;
};

type ComponentProps<TComponent> = TComponent extends new (...args: any[]) => {
  $props: infer Props;
}
  ? Props
  : TComponent extends FunctionalComponent<infer Props>
    ? Props
    : TComponent extends (props: infer Props, ...args: any[]) => unknown
      ? Props
      : Record<string, unknown>;

type RenderComponentOptions<TComponent extends Component> =
  RenderBaseOptions & {
    props?: Partial<ComponentProps<TComponent>> & Record<string, unknown>;
  };

type RenderInputOptions<TComponent extends Component> =
  | RenderBaseOptions
  | RenderComponentOptions<TComponent>;

type Rerender = {
  <TComponent extends Component>(
    component: TComponent,
    options?: {
      props?: Partial<ComponentProps<TComponent>> & Record<string, unknown>;
    }
  ): Promise<void>;
  (props: Record<string, unknown>): Promise<void>;
  (ui: VNode): Promise<void>;
};

type InternalMounted = {
  app: App<Element> | null;
  container: Element | null;
  ownsContainer: boolean;
};

const unmountMounted = (
  mountedRoots: Set<InternalMounted>,
  mounted: InternalMounted
) => {
  try {
    if (mounted.container) {
      getVueRuntime().render(null, mounted.container);
    }
  } finally {
    if (mounted.ownsContainer && mounted.container?.parentNode) {
      mounted.container.parentNode.removeChild(mounted.container);
    }

    mounted.app = null;
    mounted.container = null;
    mountedRoots.delete(mounted);
  }
};

const cleanupMountedRoots = (mountedRoots: Set<InternalMounted>) => {
  for (const mounted of [...mountedRoots]) {
    unmountMounted(mountedRoots, mounted);
  }
};

const metrics = createRenderMetricsEmitter({
  runtimeOptions: () => parseRuntimeOptions(),
  metricsStateKey: Symbol.for('@pokujs/vue.metrics-runtime-state'),
  metricsBatchMessageType: 'POKU_VUE_RENDER_METRIC_BATCH',
});

const registry = createScopedRegistry<InternalMounted>({
  name: '@pokujs/vue.mounted-roots',
  onCleanup: (mountedRoots) => {
    cleanupMountedRoots(mountedRoots);
    metrics.flushMetricBuffer();
  },
});

const isVNodeLike = (value: unknown): value is VNode =>
  typeof value === 'object' &&
  value !== null &&
  (getVueRuntime().isVNode(value) ||
    (value as Record<string, unknown>).__v_isVNode === true);

const normalizeSlots = (slots: Record<string, unknown> | undefined) => {
  if (!slots) return undefined;
  const normalized: Record<string, () => unknown> = {};
  for (const [name, slotValue] of Object.entries(slots)) {
    normalized[name] =
      typeof slotValue === 'function'
        ? (slotValue as () => unknown)
        : () => slotValue;
  }
  return normalized;
};

const toVNode = <TComponent extends Component>(
  ui: VueRenderable,
  props?: Record<string, unknown>,
  slots?: Record<string, unknown>
) => {
  if (isVNodeLike(ui)) return ui;
  return getVueRuntime().h(
    ui as Component,
    props as any,
    normalizeSlots(slots)
  );
};

const getComponentName = (ui: VueRenderable) => {
  const uiType = getVueRuntime().isVNode(ui) ? ui.type : ui;

  if (typeof uiType === 'string') return uiType;
  if (typeof uiType === 'function') return uiType.name || 'AnonymousComponent';

  const typed = uiType as { name?: string; __name?: string };
  return typed.name || typed.__name || 'AnonymousComponent';
};

const wrapUi = (ui: VNode, Wrapper?: WrapperComponent) => {
  if (!Wrapper) return ui;

  return getVueRuntime().h(Wrapper, undefined, {
    default: () => [ui],
  });
};

const applyGlobalOptions = (
  app: App<Element>,
  globalOptions?: VueGlobalOptions
) => {
  if (!globalOptions) return;

  if (globalOptions.config) {
    Object.assign(app.config, globalOptions.config);
  }

  if (globalOptions.plugins) {
    for (const pluginEntry of globalOptions.plugins) {
      if (Array.isArray(pluginEntry)) {
        const [plugin, ...pluginOptions] = pluginEntry;
        app.use(plugin, ...pluginOptions);
      } else {
        app.use(pluginEntry);
      }
    }
  }

  if (globalOptions.provide) {
    for (const key of Reflect.ownKeys(globalOptions.provide)) {
      app.provide(
        key as string | symbol,
        (globalOptions.provide as Record<PropertyKey, unknown>)[key]
      );
    }
  }

  if (globalOptions.components) {
    for (const [name, comp] of Object.entries(globalOptions.components)) {
      app.component(name, comp);
    }
  }

  if (globalOptions.directives) {
    for (const [name, dir] of Object.entries(globalOptions.directives)) {
      app.directive(name, dir);
    }
  }
};

export type RenderOptions<TComponent extends Component = Component> =
  RenderInputOptions<TComponent>;

export type RenderResult = BoundFunctions<typeof queries> & {
  container: HTMLElement;
  baseElement: HTMLElement;
  rerender: Rerender;
  unmount: () => void;
  emitted: <T = unknown[]>(eventName?: string) => T[] | Record<string, T[]>;
  asFragment: () => DocumentFragment;
  debug: (
    element?: Array<Element | HTMLDocument> | Element | HTMLDocument,
    maxLength?: number,
    options?: PrettyDOMOptions
  ) => void;
};

export function render<TComponent extends Component>(
  component: TComponent,
  options?: RenderComponentOptions<TComponent>
): RenderResult;
export function render(ui: VNode, options?: RenderBaseOptions): RenderResult;
export function render<TComponent extends Component>(
  ui: TComponent | VNode,
  options: RenderInputOptions<TComponent> = {}
): RenderResult {
  const {
    createApp,
    defineComponent,
    h,
    nextTick,
    render: renderNode,
    shallowRef,
  } = getVueRuntime();
  const mountedRoots = registry.getItems();
  const baseElement = options.baseElement || options.container || document.body;
  const container = options.container || document.createElement('div');
  const ownsContainer = !options.container;

  if (ownsContainer) baseElement.appendChild(container);

  const initialProps = (
    options as RenderComponentOptions<TComponent> | undefined
  )?.props;
  const mergedInitialProps = {
    ...(options.attrs ?? {}),
    ...(initialProps ?? {}),
  };

  const currentUiRef = shallowRef<VueRenderable>(ui);
  const currentPropsRef =
    shallowRef<Record<string, unknown>>(mergedInitialProps);
  const emittedEvents: Record<string, unknown[][]> = {};

  const recordEmit = (event: string, args: unknown[]) => {
    if (!emittedEvents[event]) emittedEvents[event] = [];
    emittedEvents[event].push(args);
  };

  const RootHarness = defineComponent({
    name: 'PokuVueTestRoot',
    setup() {
      return () => {
        const target = currentUiRef.value;
        const props = currentPropsRef.value;
        const vnode = toVNode(target, props, options.slots);
        return wrapUi(vnode, options.wrapper);
      };
    },
  });

  const app = createApp(RootHarness);
  applyGlobalOptions(app, options.global);

  // Intercept component emits on the rendered target component instance
  app.mixin({
    beforeCreate() {
      const instance = (this as any)?.$;
      if (!instance) return;
      const isDirectTarget =
        !options.wrapper && instance.parent?.type === RootHarness;
      const isWrappedTarget =
        Boolean(options.wrapper) &&
        instance.parent?.type === options.wrapper &&
        instance.parent?.parent?.type === RootHarness;
      if (isDirectTarget || isWrappedTarget) {
        const originalEmit = instance.emit;
        instance.emit = (event: string, ...args: unknown[]) => {
          recordEmit(event, args);
          return originalEmit(event, ...args);
        };
      }
    },
  });

  const mounted: InternalMounted = { app, container, ownsContainer };
  mountedRoots.add(mounted);

  const rootVNode = h(RootHarness);
  rootVNode.appContext = (
    app as unknown as { _context: VNode['appContext'] }
  )._context;

  const startedAt = getNow();
  renderNode(rootVNode, container);
  metrics.emitRenderMetric(getComponentName(ui), getNow() - startedAt);

  const unmount = () => {
    if (!mountedRoots.has(mounted)) return;
    unmountMounted(mountedRoots, mounted);
  };

  const isPlainPropsUpdate = (
    value: unknown
  ): value is Record<string, unknown> => {
    if (!value || typeof value !== 'object') return false;
    if (isVNodeLike(value)) return false;
    const obj = value as Record<string, unknown>;
    if (
      typeof obj.setup === 'function' ||
      typeof obj.render === 'function' ||
      typeof obj.template === 'string' ||
      typeof obj.__name === 'string'
    ) {
      return false;
    }
    return true;
  };

  const rerender: Rerender = async (
    nextUiOrProps: Component | VNode | Record<string, unknown>,
    nextOptions?: { props?: Record<string, unknown> }
  ) => {
    if (nextOptions !== undefined || !isPlainPropsUpdate(nextUiOrProps)) {
      currentUiRef.value = nextUiOrProps as VueRenderable;
      currentPropsRef.value = {
        ...(options.attrs ?? {}),
        ...(nextOptions?.props ?? {}),
      };
    } else {
      currentPropsRef.value = {
        ...currentPropsRef.value,
        ...nextUiOrProps,
      };
    }
    await nextTick();
  };

  const emitted = <T = unknown[]>(
    eventName?: string
  ): T[] | Record<string, T[]> => {
    if (eventName) {
      return (emittedEvents[eventName] ?? []) as T[];
    }
    return { ...emittedEvents } as Record<string, T[]>;
  };

  return {
    ...getQueriesForElement(baseElement),
    container,
    baseElement,
    rerender,
    unmount,
    emitted,
    asFragment: createAsFragment(container),
    debug: createDebug(baseElement),
  };
}

export type RenderHookOptions<Props = unknown> = RenderOptions & {
  initialProps?: Props;
};

export type RenderHookResult<Result, Props = unknown> = {
  readonly result: {
    readonly current: Result;
  };
  rerender: (nextProps?: Props) => Promise<void>;
  unmount: () => void;
};

export const renderHook = <Result, Props = undefined>(
  hook: (props: Props) => Result,
  options: RenderHookOptions<Props> = {}
): RenderHookResult<Result, Props> => {
  const { h, nextTick, shallowRef } = getVueRuntime();
  let currentResult!: Result;
  let currentProps = (options.initialProps ?? {}) as Props;
  const hookProps = shallowRef(currentProps);

  const HookHarness: Component = {
    name: 'HookHarness',
    setup() {
      return () => {
        currentResult = hook(hookProps.value);
        return null;
      };
    },
  };

  const view = render(h(HookHarness), options);
  const resultRef: { current: Result } = {
    get current() {
      return currentResult;
    },
  } as { current: Result };

  return {
    get result() {
      return resultRef;
    },
    async rerender(nextProps = currentProps) {
      currentProps = nextProps;
      hookProps.value = nextProps;
      await nextTick();
    },
    unmount: view.unmount,
  };
};

export const cleanup = () => {
  const scopedMountedRoots = registry.getScopedItems();
  if (scopedMountedRoots) cleanupMountedRoots(scopedMountedRoots);

  cleanupMountedRoots(registry.fallbackItems);

  metrics.flushMetricBuffer();
};

export const screen = createScreen() as Screen;

const baseFireEventInstance = domTestingLibrary.fireEvent;

type AsyncifyFunction<T> = T extends (...args: infer Args) => infer Result
  ? (...args: Args) => Promise<Awaited<Result>>
  : T;

type AsyncFireEvent = AsyncifyFunction<typeof domTestingLibrary.fireEvent> & {
  [Key in keyof typeof baseFireEventInstance]: AsyncifyFunction<
    (typeof baseFireEventInstance)[Key]
  >;
};

const wrappedFireEvent: AsyncFireEvent = (async (
  ...args: Parameters<typeof baseFireEventInstance>
) => {
  const result = baseFireEventInstance(...args);
  await Promise.resolve();
  await getVueRuntime().nextTick();
  return result;
}) as AsyncFireEvent;

wrapFireEventMethods(
  wrappedFireEvent as unknown as Record<string, unknown>,
  baseFireEventInstance as unknown as Record<string, unknown>,
  async (invoke) => {
    const result = invoke();
    await Promise.resolve();
    await getVueRuntime().nextTick();
    return result;
  }
);

export const fireEvent = wrappedFireEvent;
export const waitFor = createWaitFor(domTestingLibrary.waitFor);

export * from '@testing-library/dom';
