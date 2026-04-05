import type {
  VueDomAdapter,
  VueMetricsOptions,
  VueMetricsSummary,
  VueTestingPluginOptions,
} from './plugin-types.ts';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from 'node:process';
import {
  createFrameworkTestingPluginFactory,
  type FrameworkDescriptor,
} from '@pokujs/dom';
import { definePlugin } from 'poku/plugins';
import {
  buildRunnerCommand,
  canHandleRuntime,
  prepareRuntimeTestGraph,
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

const DEFAULT_FILTER = /\.(test|spec)\./i;
const CORE_EXCLUDES = new Set(['node_modules', '.git', '.pokujs-vue-runtime']);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildExcludePatterns = (
  exclude: RegExp | string | Array<RegExp | string> | undefined
): RegExp[] => {
  if (!exclude) return [];
  return [exclude].flat().map((p) =>
    p instanceof RegExp ? p : new RegExp(escapeRegExp(p), 'i')
  );
};

const collectTestFiles = async (
  dirPath: string,
  filter: RegExp,
  excludePatterns: RegExp[],
  files: Set<string>
): Promise<void> => {
  let entry;
  try {
    entry = await stat(dirPath);
  } catch {
    return;
  }

  if (entry.isFile()) {
    if (filter.test(dirPath) && !excludePatterns.some((p) => p.test(dirPath)))
      files.add(dirPath);
    return;
  }

  const entries = await readdir(dirPath, { withFileTypes: true });
  await Promise.all(
    entries.map(async (dirent) => {
      const fullPath = join(dirPath, dirent.name);
      if (CORE_EXCLUDES.has(dirent.name)) return;
      if (excludePatterns.some((p) => p.test(fullPath))) return;
      if (dirent.isDirectory()) {
        await collectTestFiles(fullPath, filter, excludePatterns, files);
      } else if (dirent.isFile() && filter.test(fullPath)) {
        files.add(fullPath);
      }
    })
  );
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

export const createVueTestingPlugin = (options: VueTestingPluginOptions = {}) => {
  const base = createTestingPlugin(options);

  return definePlugin({
    ...base,

    async discoverFiles(paths: string[], context: any): Promise<string[]> {
      const filter: RegExp =
        (env.FILTER?.trim() ? new RegExp(escapeRegExp(env.FILTER), 'i') : undefined) ??
        context.configs?.filter ??
        DEFAULT_FILTER;
      const excludePatterns = buildExcludePatterns(context.configs?.exclude);

      const files = new Set<string>();
      await Promise.all(
        paths.map((dir) =>
          collectTestFiles(join(context.cwd, dir), filter, excludePatterns, files)
        )
      );

      const needsGraphTransformation =
        (context.runtime === 'bun' || context.runtime === 'deno') &&
        context.configs?.isolation === 'none';

      if (!needsGraphTransformation) return Array.from(files);

      return Array.from(files).map((file) => prepareRuntimeTestGraph(file));
    },
  });
};

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
