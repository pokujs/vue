import { assert, describe, test } from 'poku';
import { join } from 'node:path';
import {
  collectLocalImportSpecifiers,
  resolveLocalModulePath,
  rewriteVueImportSpecifier,
} from '../../src/plugin-command.ts';

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
    assert.strictEqual(
      rewriteVueImportSpecifier(source, './Foo.vue'),
      source
    );
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
