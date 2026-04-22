import { assert, describe, test } from 'poku';
import { buildRunnerCommand } from '../../src/plugin-command.ts';

describe('debug bun command', () => {
  test('logs the built command for bun', async () => {
    const file = 'tests/__fixtures__/CounterButton.vue';
    const result = buildRunnerCommand({
      runtime: 'bun',
      command: ['bun', file],
      file: file,
      domSetupPath: '/tmp/dom-setup.ts',
      runtimeOptionArgs: [],
    });

    console.log('Bun command:', result.command);
    console.log('shouldHandle:', result.shouldHandle);

    const preloadFlag = result.command.find(arg => arg.startsWith('--preload'));
    console.log('preloadFlag:', preloadFlag);

    assert.ok(Array.isArray(result.command));
    assert.ok(result.command[2].includes('.pokujs-vue-runtime'));
    assert.ok(preloadFlag, 'Expected --preload flag for Bun');
    assert.strictEqual(preloadFlag, '--preload /tmp/dom-setup.ts');
  });
});