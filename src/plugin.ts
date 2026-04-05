import type {
  VueDomAdapter,
  VueMetricsOptions,
  VueMetricsSummary,
  VueTestingPluginOptions,
} from './plugin-types.ts';
import {
  createFrameworkTestingPluginFactory,
  type FrameworkDescriptor,
} from '@pokujs/dom';
import {
  buildRunnerCommand,
  canHandleRuntime,
  resolveDomSetupPath,
} from './plugin-command.ts';
import {
  buildRuntimeOptionArgs,
  createMetricsSummary,
  getComponentName,
  isRenderMetricBatchMessage,
  isRenderMetricMessage,
  normalizeMetricsOptions,
  selectTopSlowestMetrics,
} from './plugin-metrics.ts';

export type {
  VueDomAdapter,
  VueMetricsOptions,
  VueMetricsSummary,
  VueTestingPluginOptions,
};

const descriptor: FrameworkDescriptor = {
  pluginName: 'vue-testing',
  packageTag: '@pokujs/vue',
  runtimeArgBase: 'poku-vue',
  metricMessageType: 'POKU_VUE_RENDER_METRIC',
  metricBatchMessageType: 'POKU_VUE_RENDER_METRIC_BATCH',
  testFileExtensions: ['.ts', '.tsx', '.jsx'],
  commandBuilder: (input) => buildRunnerCommand(input),
};

const { createTestingPlugin } = createFrameworkTestingPluginFactory(
  descriptor,
  import.meta.url
);

export const createVueTestingPlugin = (
  options: VueTestingPluginOptions = {}
) => createTestingPlugin(options);

export const vueTestingPlugin = createVueTestingPlugin;

export const __internal = {
  buildRunnerCommand,
  canHandleRuntime,
  buildRuntimeOptionArgs,
  normalizeMetricsOptions,
  selectTopSlowestMetrics,
  createMetricsSummary,
  getComponentName,
  isRenderMetricMessage,
  isRenderMetricBatchMessage,
  resolveDomSetupPath,
};
