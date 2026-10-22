/** Plugin factory and alias for Poku integration. */
export { createVueTestingPlugin, vueTestingPlugin } from './plugin.ts';
export type {
  VueDomAdapter,
  VueMetricsOptions,
  VueMetricsSummary,
  VueTestingPluginOptions,
} from './plugin.ts';
/** Vue testing helpers and DX exports. */
export {
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from './vue-testing.ts';
export type {
  RenderHookOptions,
  RenderHookResult,
  RenderOptions,
  RenderResult,
  VueGlobalOptions,
} from './vue-testing.ts';
export * from '@testing-library/dom';
