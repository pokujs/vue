import { registerVueSfcLoader } from './vue-sfc-loader-register.ts';
import { setupHappyDomEnvironment } from '@pokujs/dom';
import { parseRuntimeOptions } from './runtime-options.ts';

registerVueSfcLoader();

await setupHappyDomEnvironment({
  runtimeOptions: parseRuntimeOptions(),
  packageTag: '@pokujs/vue',
});
