import type { VueDomAdapter } from './plugin-types.ts';
import {
  buildRunnerCommand as buildCoreRunnerCommand,
  canHandleRuntime,
  createDomSetupPathResolver,
  type BuildRunnerCommandInput,
} from '@pokujs/dom';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileVueSfcModuleSync } from './vue-sfc-loader.ts';

const currentDir = dirname(fileURLToPath(import.meta.url));

const resolveSetupModulePath = (baseName: string) => {
  const jsPath = resolve(currentDir, `${baseName}.js`);
  if (existsSync(jsPath)) return jsPath;
  return resolve(currentDir, `${baseName}.ts`);
};

const happyDomSetupPath = resolveSetupModulePath('dom-setup-happy');
const jsdomSetupPath = resolveSetupModulePath('dom-setup-jsdom');

const vueExtensions = new Set(['.ts', '.tsx', '.jsx']);

export const resolveDomSetupPath = createDomSetupPathResolver(
  '@pokujs/vue',
  happyDomSetupPath,
  jsdomSetupPath
);

const importSpecifierPattern =
  /\bfrom\s+['"]([^'"]+)['"]|\bimport\s+['"]([^'"]+)['"]/g;

const moduleResolutionCandidates = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.vue',
  '/index.ts',
  '/index.tsx',
  '/index.js',
  '/index.jsx',
  '/index.mjs',
  '/index.cjs',
  '/index.vue',
];

export const collectLocalImportSpecifiers = (source: string): string[] => {
  const specifiers: string[] = [];
  for (const match of source.matchAll(importSpecifierPattern)) {
    const specifier = match[1] ?? match[2];
    if (specifier && specifier.startsWith('.')) specifiers.push(specifier);
  }
  return specifiers;
};

export const resolveLocalModulePath = (fromFile: string, specifier: string) => {
  const basePath = resolve(dirname(fromFile), specifier);

  for (const suffix of moduleResolutionCandidates) {
    const candidate = `${basePath}${suffix}`;
    if (existsSync(candidate)) return candidate;
  }

  return null;
};

export const rewriteVueImportSpecifier = (source: string, specifier: string) => {
  return source
    .replaceAll(`'${specifier}'`, `'${specifier}.js'`)
    .replaceAll(`"${specifier}"`, `"${specifier}.js"`);
};

const prepareRuntimeTestGraph = (entryFile: string) => {
  const projectRoot = process.cwd();
  const resolvedEntryFile = resolve(projectRoot, entryFile);
  const relativeEntryFile = relative(projectRoot, resolvedEntryFile);
  const entryHash = createHash('sha1')
    .update(relativeEntryFile)
    .digest('hex')
    .slice(0, 12);
  const runtimeRoot = join(
    projectRoot,
    '.pokujs-vue-runtime',
    entryHash
  );
  const seen = new Set<string>();

  const emitModule = (modulePath: string) => {
    if (seen.has(modulePath)) return;
    seen.add(modulePath);

    const relativePath = relative(projectRoot, modulePath);
    const moduleExtension = extname(modulePath);

    let source = readFileSync(modulePath, 'utf8');

    for (const specifier of collectLocalImportSpecifiers(source)) {
      const resolvedPath = resolveLocalModulePath(modulePath, specifier);
      if (!resolvedPath) continue;

      emitModule(resolvedPath);

      if (specifier.endsWith('.vue')) {
        source = rewriteVueImportSpecifier(source, specifier);
      }
    }

    if (moduleExtension === '.vue') {
      const compiledPath = join(runtimeRoot, `${relativePath}.js`);
      // Skip recompilation if the output already exists and is newer than the source.
      if (!existsSync(compiledPath) || statSync(modulePath).mtimeMs > statSync(compiledPath).mtimeMs) {
        mkdirSync(dirname(compiledPath), { recursive: true });
        writeFileSync(compiledPath, compileVueSfcModuleSync(source, modulePath), 'utf8');
      }
      return;
    }

    const outputPath = join(runtimeRoot, relativePath);
    // Skip re-writing non-vue modules when the output is already up-to-date.
    if (!existsSync(outputPath) || statSync(modulePath).mtimeMs > statSync(outputPath).mtimeMs) {
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, source, 'utf8');
    }
  };

  emitModule(resolvedEntryFile);

  return join(runtimeRoot, relativeEntryFile);
};

export const buildRunnerCommand = (
  input: Omit<BuildRunnerCommandInput, 'extensions'>
) => {
  const runtime = input.runtime;
  const runtimeFile = runtime === 'bun' || runtime === 'deno'
    ? prepareRuntimeTestGraph(input.file)
    : input.file;
  const runtimeCommand = input.command.map((item) =>
    item === input.file ? runtimeFile : item
  );

  const result = buildCoreRunnerCommand({
    ...input,
    command: runtimeCommand,
    file: runtimeFile,
    extensions: vueExtensions,
  });

  return result;
};

export { canHandleRuntime, prepareRuntimeTestGraph };
