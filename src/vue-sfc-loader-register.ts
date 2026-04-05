import { existsSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const registrationKey = Symbol.for('@pokujs/vue.sfc-loader-registered');

type LoaderRegistrationGlobal = typeof globalThis & {
  [registrationKey]?: boolean;
};

const currentDir = dirname(fileURLToPath(import.meta.url));
const hooksModulePath = (() => {
  const jsPath = resolve(currentDir, 'vue-sfc-loader-hooks.js');
  if (existsSync(jsPath)) return jsPath;
  return resolve(currentDir, 'vue-sfc-loader-hooks.ts');
})();

const loaderGlobal = globalThis as LoaderRegistrationGlobal;

export const registerVueSfcLoader = () => {
  if (loaderGlobal[registrationKey]) return;

  register(pathToFileURL(hooksModulePath).href, import.meta.url);
  loaderGlobal[registrationKey] = true;
};