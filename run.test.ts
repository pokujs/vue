import { assert, poku } from 'poku';
import { vueTestingPlugin } from './src/plugin.ts';

// isolation: 'none' — test files run in the same process; suites must be sequential
const happyCode = await poku('tests', {
  noExit: true,
  isolation: 'none',
  plugins: [vueTestingPlugin({ dom: 'happy-dom' })],
});

assert.strictEqual(happyCode, 0, 'happy-dom suite');

// jsdom is not compatible with Deno
if (typeof Deno === 'undefined') {
  const jsdomCode = await poku('tests', {
    noExit: true,
    isolation: 'process',
    plugins: [vueTestingPlugin({ dom: 'jsdom' })],
  });

  assert.strictEqual(jsdomCode, 0, 'jsdom suite');
}
