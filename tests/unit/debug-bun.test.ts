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
    assert.ok(Array.isArray(result.command));
    assert.ok(result.command[1].includes('.pokujs-vue-runtime'));
  });
});