import { setupHappyDomEnvironment } from '@pokujs/dom';
import { parseRuntimeOptions } from './runtime-options.ts';
import { registerVueSfcLoader } from './vue-sfc-loader-register.ts';

const g = globalThis as typeof globalThis & {
  __VUE_DEVTOOLS_GLOBAL_HOOK__?: { enabled?: boolean; emit: () => void };
};
g.__VUE_DEVTOOLS_GLOBAL_HOOK__ ??= { enabled: false, emit() {} };

registerVueSfcLoader();

await setupHappyDomEnvironment({
  runtimeOptions: parseRuntimeOptions(),
  packageTag: '@pokujs/vue',
});
