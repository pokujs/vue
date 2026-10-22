import { Buffer } from 'node:buffer';
import {
  closeSync,
  fstatSync,
  ftruncateSync,
  futimesSync,
  mkdtempSync,
  openSync,
  readSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { assert, describe, test } from 'poku';
import {
  buildRunnerCommand,
  collectLocalImportSpecifiers,
  prepareRuntimeTestGraph,
  resolveLocalModulePath,
  rewriteVueImportSpecifier,
} from '../../src/plugin-command.ts';

describe('runtime module cache', () => {
  test('reuses current modules and truncates stale output before rewriting', () => {
    const root = mkdtempSync(join(process.cwd(), 'tests/.runtime-cache-'));
    const entry = join(root, 'entry.ts');
    const outputRoot = join(
      process.cwd(),
      '.pokujs-vue-runtime',
      relative(process.cwd(), root)
    );

    try {
      writeFileSync(entry, 'export const value = "original long value";');
      const output = prepareRuntimeTestGraph(entry);
      const outputFd = openSync(output, 'r+');
      const readOutput = () => {
        const content = Buffer.alloc(fstatSync(outputFd).size);
        readSync(outputFd, content, 0, content.length, 0);
        return content.toString('utf8');
      };
      try {
        const original = readOutput();
        const cachedTime = new Date(Date.now() + 60_000);
        futimesSync(outputFd, cachedTime, cachedTime);
        const cachedMtime = fstatSync(outputFd).mtimeMs;

        prepareRuntimeTestGraph(entry);
        assert.strictEqual(fstatSync(outputFd).mtimeMs, cachedMtime);
        assert.strictEqual(readOutput(), original);

        writeFileSync(entry, 'export const value = 1;');
        const staleTime = new Date(0);
        futimesSync(outputFd, staleTime, staleTime);
        prepareRuntimeTestGraph(entry);
        assert.strictEqual(readOutput(), 'export const value = 1;');

        ftruncateSync(outputFd, 0);
        prepareRuntimeTestGraph(entry);
        assert.strictEqual(readOutput(), 'export const value = 1;');
      } finally {
        closeSync(outputFd);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outputRoot, { recursive: true, force: true });
    }
  });
});

describe('rewriteVueImportSpecifier', () => {
  test('replaces single-quoted specifier by appending .js', () => {
    const source = `import Foo from './Foo.vue'`;
    assert.strictEqual(
      rewriteVueImportSpecifier(source, './Foo.vue'),
      `import Foo from './Foo.vue.js'`
    );
  });

  test('replaces double-quoted specifier by appending .js', () => {
    const source = `import Foo from "./Foo.vue"`;
    assert.strictEqual(
      rewriteVueImportSpecifier(source, './Foo.vue'),
      `import Foo from "./Foo.vue.js"`
    );
  });

  test('replaces all occurrences of the specifier', () => {
    const source = `import A from './A.vue'\nimport B from './A.vue'`;
    assert.strictEqual(
      rewriteVueImportSpecifier(source, './A.vue'),
      `import A from './A.vue.js'\nimport B from './A.vue.js'`
    );
  });

  test('does not alter specifiers that do not match', () => {
    const source = `import Foo from './Other.vue'`;
    assert.strictEqual(rewriteVueImportSpecifier(source, './Foo.vue'), source);
  });

  test('does not alter non-import text that partially matches', () => {
    const source = `// comment: './Foo.vue' is nice\nimport Foo from './Foo.vue'`;
    const result = rewriteVueImportSpecifier(source, './Foo.vue');
    assert.strictEqual(
      result,
      `// comment: './Foo.vue.js' is nice\nimport Foo from './Foo.vue.js'`
    );
  });
});

describe('collectLocalImportSpecifiers', () => {
  test('returns named imports starting with ./', () => {
    const source = `import Foo from './Foo.vue'\nimport Bar from './Bar.ts'`;
    assert.deepStrictEqual(collectLocalImportSpecifiers(source), [
      './Foo.vue',
      './Bar.ts',
    ]);
  });

  test('returns side-effect imports starting with ./', () => {
    const source = `import './styles.css'`;
    assert.deepStrictEqual(collectLocalImportSpecifiers(source), [
      './styles.css',
    ]);
  });

  test('ignores package imports (no leading dot)', () => {
    const source = `import vue from 'vue'\nimport { ref } from 'vue'`;
    assert.deepStrictEqual(collectLocalImportSpecifiers(source), []);
  });

  test('ignores bare specifiers that start with /', () => {
    const source = `import '/absolute/path.ts'`;
    assert.deepStrictEqual(collectLocalImportSpecifiers(source), []);
  });

  test('handles relative parent paths (../)', () => {
    const source = `import Util from '../utils/helper.ts'`;
    assert.deepStrictEqual(collectLocalImportSpecifiers(source), [
      '../utils/helper.ts',
    ]);
  });

  test('returns empty array for source with no imports', () => {
    assert.deepStrictEqual(collectLocalImportSpecifiers('const x = 1;'), []);
  });

  test('collects both from-imports and side-effect imports in order', () => {
    const source = [
      `import './a.ts'`,
      `import Foo from './b.vue'`,
      `import { x } from 'external'`,
      `import Bar from '../c.ts'`,
    ].join('\n');

    assert.deepStrictEqual(collectLocalImportSpecifiers(source), [
      './a.ts',
      './b.vue',
      '../c.ts',
    ]);
  });
});

describe('resolveLocalModulePath', () => {
  const fixturesDir = join(process.cwd(), 'tests/__fixtures__');
  const fakeFromFile = join(fixturesDir, '_fake_entry.ts');

  test('resolves an existing .vue file by exact path', () => {
    const result = resolveLocalModulePath(fakeFromFile, './CounterButton.vue');
    assert.ok(result !== null, 'expected a non-null result');
    assert.ok(result!.endsWith('CounterButton.vue'));
  });

  test('resolves an extensionless specifier to a .vue file', () => {
    const result = resolveLocalModulePath(fakeFromFile, './CounterButton');
    assert.ok(result !== null, 'expected a non-null result');
    assert.ok(result!.endsWith('CounterButton.vue'), `got: ${result}`);
  });

  test('returns null for a specifier that does not resolve to any file', () => {
    const result = resolveLocalModulePath(fakeFromFile, './DoesNotExist');
    assert.strictEqual(result, null);
  });
});

describe('buildRunnerCommand', () => {
  test('rewrites Bun test entry into .pokujs-vue-runtime and injects --preload=', () => {
    const file = 'tests/vue-sfc-component.test.ts';
    const result = buildRunnerCommand({
      runtime: 'bun',
      command: ['bun', file],
      file,
      domSetupPath: '/tmp/dom-setup.ts',
      runtimeOptionArgs: [],
    });

    assert.strictEqual(result.shouldHandle, true);
    const preloadFlag = result.command.find((arg) =>
      arg.startsWith('--preload=')
    );
    assert.strictEqual(preloadFlag, '--preload=/tmp/dom-setup.ts');
    assert.ok(result.command[2]?.includes('.pokujs-vue-runtime'));
  });
});
