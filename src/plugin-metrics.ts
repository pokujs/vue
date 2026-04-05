import type {
  NormalizedMetricsOptions,
  VueMetricsSummary,
  VueTestingPluginOptions,
  RenderMetric,
} from './plugin-types.ts';
import {
  buildRuntimeOptionArgs as buildCoreRuntimeOptionArgs,
  createMetricsSummary,
  getComponentName,
  isRenderMetricBatchMessage as isCoreRenderMetricBatchMessage,
  isRenderMetricMessage as isCoreRenderMetricMessage,
  normalizeMetricsOptions,
  printMetricsSummary as printCoreMetricsSummary,
  selectTopSlowestMetrics,
} from '@pokujs/dom';
import { runtimeOptionArgPrefixes } from './runtime-options.ts';

const VUE_RENDER_METRIC = 'POKU_VUE_RENDER_METRIC';
const VUE_RENDER_METRIC_BATCH = 'POKU_VUE_RENDER_METRIC_BATCH';

export const isRenderMetricMessage = (message: unknown) =>
  isCoreRenderMetricMessage(message, VUE_RENDER_METRIC);

export const isRenderMetricBatchMessage = (message: unknown) =>
  isCoreRenderMetricBatchMessage(message, VUE_RENDER_METRIC_BATCH);

export const buildRuntimeOptionArgs = (
  options: VueTestingPluginOptions,
  metricsOptions: NormalizedMetricsOptions
) => buildCoreRuntimeOptionArgs(options, metricsOptions, runtimeOptionArgPrefixes);

export const printMetricsSummary = (summary: VueMetricsSummary) =>
  printCoreMetricsSummary(summary, '@pokujs/vue');

export {
  createMetricsSummary,
  getComponentName,
  normalizeMetricsOptions,
  selectTopSlowestMetrics,
};

export type { RenderMetric };
