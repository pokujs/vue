import { defineConfig } from 'poku';
import { vueTestingPlugin } from './src/plugin.ts';

const dom = process.env.POKU_VUE_TEST_DOM;
if (!dom) {
  throw new Error('POKU_VUE_TEST_DOM environment variable is not set');
}

export default defineConfig({
  plugins: [vueTestingPlugin({ dom })],
  isolation: 'process',
});
