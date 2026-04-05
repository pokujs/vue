import { registerVueSfcLoader } from './vue-sfc-loader-register.ts';
import { setupJsdomEnvironment } from '@pokujs/dom';
import { parseRuntimeOptions } from './runtime-options.ts';

registerVueSfcLoader();

await setupJsdomEnvironment({
  runtimeOptions: parseRuntimeOptions(),
  packageTag: '@pokujs/vue',
});
