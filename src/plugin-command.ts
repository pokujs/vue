import type { VueDomAdapter } from './plugin-types.ts';
import {
  buildRunnerCommand as buildCoreRunnerCommand,
  canHandleRuntime,
  createDomSetupPathResolver,
  type BuildRunnerCommandInput,
} from '@pokujs/dom';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const currentDir = dirname(fileURLToPath(import.meta.url));

const resolveSetupModulePath = (baseName: string) => {
  const jsPath = resolve(currentDir, `${baseName}.js`);
  if (existsSync(jsPath)) return jsPath;
  return resolve(currentDir, `${baseName}.ts`);
};

const happyDomSetupPath = resolveSetupModulePath('dom-setup-happy');
const jsdomSetupPath = resolveSetupModulePath('dom-setup-jsdom');

const vueExtensions = new Set(['.ts', '.tsx', '.jsx']);

export const resolveDomSetupPath = createDomSetupPathResolver(
  '@pokujs/vue',
  happyDomSetupPath,
  jsdomSetupPath
);

export const buildRunnerCommand = (
  input: Omit<BuildRunnerCommandInput, 'extensions'>
) => buildCoreRunnerCommand({ ...input, extensions: vueExtensions });

export { canHandleRuntime };
