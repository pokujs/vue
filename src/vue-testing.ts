import type { BoundFunctions, Screen } from '@testing-library/dom';
import type { Component, FunctionalComponent, VNode } from 'vue';
import { getQueriesForElement, queries } from '@testing-library/dom';
import * as domTestingLibrary from '@testing-library/dom';
import { h, isVNode, nextTick, render as renderNode } from 'vue';
import {
  createRenderMetricsEmitter,
  createScreen,
  getNow,
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

const mountedRoots = new Set<InternalMounted>();

const unmountMounted = (mounted: InternalMounted) => {
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
    unmountMounted(mounted);
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

  const HookHarness: Component = {
    name: 'HookHarness',
    setup() {
      return () => {
        currentResult = hook(currentProps);
        return null;
      };
    },
  };

  const view = render(h(HookHarness), options);

  return {
    get result() {
      return { current: currentResult };
    },
    async rerender(nextProps = currentProps) {
      currentProps = nextProps;
      await view.rerender(h(HookHarness));
    },
    unmount: view.unmount,
  };
};

export const cleanup = () => {
  for (const mounted of [...mountedRoots]) {
    unmountMounted(mounted);
  }

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

for (const key of Object.keys(baseFireEventInstance) as Array<
  keyof typeof baseFireEventInstance
>) {
  const value = baseFireEventInstance[key];

  if (typeof value !== 'function') {
    Object.assign(wrappedFireEvent, { [key]: value });
    continue;
  }

  Object.assign(wrappedFireEvent, {
    [key]: async (...args: unknown[]) => {
      const result = Reflect.apply(value, baseFireEventInstance, args);
      await Promise.resolve();
      await nextTick();
      return result;
    },
  });
}

export const fireEvent = wrappedFireEvent;

export * from '@testing-library/dom';
