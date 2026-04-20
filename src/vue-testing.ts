import type { BoundFunctions, Screen } from '@testing-library/dom';
import type { Component, FunctionalComponent, VNode } from 'vue';
import { getQueriesForElement, queries } from '@testing-library/dom';
import * as domTestingLibrary from '@testing-library/dom';
import * as pokuDom from '@pokujs/dom';
import { h, isVNode, nextTick, render as renderNode, shallowRef } from 'vue';
import {
  createRenderMetricsEmitter,
  createScreen,
  getNow,
  wrapFireEventMethods,
} from '@pokujs/dom';
import { parseRuntimeOptions } from './runtime-options.ts';

type WrapperComponent = Component;
type VueRenderable = Component | VNode;
type RenderBaseOptions = {
  container?: HTMLElement;
  baseElement?: HTMLElement;
  wrapper?: WrapperComponent;
};

type ComponentProps<TComponent> =
  TComponent extends new (...args: any[]) => { $props: infer Props }
    ? Props
    : TComponent extends FunctionalComponent<infer Props>
      ? Props
      : TComponent extends (props: infer Props, ...args: any[]) => unknown
        ? Props
        : never;

type RenderComponentOptions<TComponent extends Component> = RenderBaseOptions & {
  props?: ComponentProps<TComponent>;
};

type RenderInputOptions<TComponent extends Component> =
  | RenderBaseOptions
  | RenderComponentOptions<TComponent>;

type Rerender = {
  <TComponent extends Component>(
    component: TComponent,
    options?: { props?: ComponentProps<TComponent> }
  ): Promise<void>;
  (ui: VNode): Promise<void>;
};

type InternalMounted = {
  container: Element | null;
  ownsContainer: boolean;
};

type ScopeSlot<T> = {
  readonly value: T;
};

type ScopeLike = {
  getOrCreateSlot<T>(key: symbol, init: () => T): ScopeSlot<T>;
  getSlot?<T>(key: symbol): ScopeSlot<T> | undefined;
  addCleanup?(fn: () => void | Promise<void>): void;
};

type DomScopeApi = {
  defineSlotKey?: <T>(name: string) => symbol;
  getOrCreateScope?: () => ScopeLike | undefined;
  getCurrentScope?: () => ScopeLike | undefined;
};

const domScopeApi = pokuDom as unknown as DomScopeApi;

const MOUNTED_ROOTS_SLOT_KEY =
  typeof domScopeApi.defineSlotKey === 'function'
    ? domScopeApi.defineSlotKey<Set<InternalMounted>>(
        '@pokujs/vue.mounted-roots'
      )
    : undefined;

const CLEANUP_STATE_SLOT_KEY =
  typeof domScopeApi.defineSlotKey === 'function'
    ? domScopeApi.defineSlotKey<{ registered: boolean }>(
        '@pokujs/vue.cleanup-registered'
      )
    : undefined;

const fallbackMountedRoots = new Set<InternalMounted>();

const cleanupMountedRoots = (mountedRoots: Set<InternalMounted>) => {
  for (const mounted of [...mountedRoots]) {
    unmountMounted(mountedRoots, mounted);
  }
};

const getScopedMountedRoots = (): Set<InternalMounted> | undefined => {
  if (!MOUNTED_ROOTS_SLOT_KEY) return undefined;
  if (typeof domScopeApi.getOrCreateScope !== 'function') return undefined;

  const scope = domScopeApi.getOrCreateScope();
  if (!scope) return undefined;

  const mountedRoots = scope.getOrCreateSlot(MOUNTED_ROOTS_SLOT_KEY, () =>
    new Set<InternalMounted>()
  ).value;

  if (!CLEANUP_STATE_SLOT_KEY || typeof scope.addCleanup !== 'function') {
    return mountedRoots;
  }

  const cleanupState = scope.getOrCreateSlot(CLEANUP_STATE_SLOT_KEY, () => ({
    registered: false,
  })).value;

  if (!cleanupState.registered) {
    cleanupState.registered = true;
    scope.addCleanup(() => {
      cleanupMountedRoots(mountedRoots);
      metrics.flushMetricBuffer();
    });
  }

  return mountedRoots;
};

const getMountedRoots = (): Set<InternalMounted> =>
  getScopedMountedRoots() ?? fallbackMountedRoots;

const getCurrentScopedMountedRoots = (): Set<InternalMounted> | undefined => {
  if (!MOUNTED_ROOTS_SLOT_KEY) return undefined;
  if (typeof domScopeApi.getCurrentScope !== 'function') return undefined;

  const scope = domScopeApi.getCurrentScope();
  const slot = scope?.getSlot?.<Set<InternalMounted>>(MOUNTED_ROOTS_SLOT_KEY);
  return slot?.value;
};

const unmountMounted = (
  mountedRoots: Set<InternalMounted>,
  mounted: InternalMounted
) => {
  try {
    if (mounted.container) {
      renderNode(null, mounted.container);
    }
  } finally {
    if (mounted.ownsContainer && mounted.container?.parentNode) {
      mounted.container.parentNode.removeChild(mounted.container);
    }

    mounted.container = null;
    mountedRoots.delete(mounted);
  }
};

const isVNodeLike = (value: unknown): value is VNode =>
  typeof value === 'object' &&
  value !== null &&
  (isVNode(value) || (value as Record<string, unknown>).__v_isVNode === true);

const toVNode = <TComponent extends Component>(
  ui: VueRenderable,
  options?: RenderInputOptions<TComponent>
) => {
  if (isVNodeLike(ui)) return ui;
  return h(ui as Component, (options as RenderComponentOptions<TComponent> | undefined)?.props as any);
};

const getComponentName = (ui: VueRenderable) => {
  const uiType = isVNode(ui) ? ui.type : ui;

  if (typeof uiType === 'string') return uiType;
  if (typeof uiType === 'function') return uiType.name || 'AnonymousComponent';

  const typed = uiType as { name?: string; __name?: string };
  return typed.name || typed.__name || 'AnonymousComponent';
};

const runtimeOptions = parseRuntimeOptions();
const metrics = createRenderMetricsEmitter({
  runtimeOptions,
  metricsStateKey: Symbol.for('@pokujs/vue.metrics-runtime-state'),
  metricsBatchMessageType: 'POKU_VUE_RENDER_METRIC_BATCH',
});

const wrapUi = (ui: VueRenderable, Wrapper?: WrapperComponent) => {
  const wrapped = toVNode(ui);
  if (!Wrapper) return wrapped;

  return h(Wrapper, undefined, {
    default: () => [wrapped],
  });
};

export type RenderOptions<TComponent extends Component = Component> =
  RenderInputOptions<TComponent>;

export type RenderResult = BoundFunctions<typeof queries> & {
  container: HTMLElement;
  baseElement: HTMLElement;
  rerender: Rerender;
  unmount: () => void;
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
  const mountedRoots = getMountedRoots();
  const baseElement = options.baseElement || document.body;
  const container = options.container || document.createElement('div');
  const ownsContainer = !options.container;

  if (ownsContainer) baseElement.appendChild(container);

  const mounted: InternalMounted = { container, ownsContainer };
  mountedRoots.add(mounted);

  const startedAt = getNow();
  renderNode(wrapUi(toVNode(ui, options), options.wrapper), container);
  metrics.emitRenderMetric(getComponentName(ui), getNow() - startedAt);

  const unmount = () => {
    if (!mountedRoots.has(mounted)) return;
    unmountMounted(mountedRoots, mounted);
  };

  const rerender: Rerender = async (
    nextUi: Component | VNode,
    nextOptions?: { props?: unknown }
  ) => {
    renderNode(
      wrapUi(
        toVNode(nextUi, nextOptions as RenderInputOptions<Component> | undefined),
        options.wrapper
      ),
      container
    );
    await nextTick();
  };

  return {
    ...getQueriesForElement(baseElement),
    container,
    baseElement,
    rerender,
    unmount,
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

export const renderHook = <Result, Props = Record<string, unknown>>(
  hook: (props: Props) => Result,
  options: RenderHookOptions<Props> = {}
): RenderHookResult<Result, Props> => {
  let currentResult!: Result;
  let currentProps = options.initialProps ?? ({} as Props);
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
  const scopedMountedRoots = getCurrentScopedMountedRoots();
  if (scopedMountedRoots) cleanupMountedRoots(scopedMountedRoots);

  cleanupMountedRoots(fallbackMountedRoots);

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
  await nextTick();
  return result;
}) as AsyncFireEvent;

wrapFireEventMethods(
  wrappedFireEvent as unknown as Record<string, unknown>,
  baseFireEventInstance as unknown as Record<string, unknown>,
  async (invoke) => {
    const result = invoke();
    await Promise.resolve();
    await nextTick();
    return result;
  }
);

export const fireEvent = wrappedFireEvent;

export * from '@testing-library/dom';
