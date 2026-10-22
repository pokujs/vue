import type { BuildRunnerCommandInput } from '@pokujs/dom';
import type { VueDomAdapter } from './plugin-types.ts';
import {
  closeSync,
  existsSync,
  fstatSync,
  ftruncateSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildRunnerCommand as buildCoreRunnerCommand,
  canHandleRuntime,
  createDomSetupPathResolver,
} from '@pokujs/dom';
import { compileVueSfcModuleSync } from './vue-sfc-loader.ts';

const currentDir = dirname(fileURLToPath(import.meta.url));

const resolveSetupModulePath = (baseName: string) => {
  const jsPath = resolve(currentDir, `${baseName}.js`);
  if (existsSync(jsPath)) return jsPath;
  return resolve(currentDir, `${baseName}.ts`);
};

const happyDomSetupPath = resolveSetupModulePath('dom-setup-happy');
const jsdomSetupPath = resolveSetupModulePath('dom-setup-jsdom');

const vueExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.vue']);

export const resolveDomSetupPath = createDomSetupPathResolver(
  '@pokujs/vue',
  happyDomSetupPath,
  jsdomSetupPath
);

const importSpecifierPattern =
  /\bfrom\s+['"]([^'"]+)['"]|\bimport\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

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
    const specifier = match[1] ?? match[2] ?? match[3];
    if (specifier && specifier.startsWith('.')) specifiers.push(specifier);
  }
  return specifiers;
};

export const resolveLocalModulePath = (fromFile: string, specifier: string) => {
  const basePath = resolve(dirname(fromFile), specifier);

  for (const suffix of moduleResolutionCandidates) {
    const candidate = `${basePath}${suffix}`;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }

  return null;
};

export const rewriteVueImportSpecifier = (
  source: string,
  specifier: string,
  resolvedPath?: string
) => {
  const replacement = specifier.endsWith('.vue')
    ? `${specifier}.js`
    : resolvedPath?.endsWith('/index.vue')
      ? `${specifier.replace(/\/$/, '')}/index.vue.js`
      : `${specifier}.vue.js`;

  return source
    .replaceAll(`'${specifier}'`, `'${replacement}'`)
    .replaceAll(`"${specifier}"`, `"${replacement}"`);
};

const writeRuntimeModule = (
  outputPath: string,
  sourcePath: string,
  getSource: () => string
) => {
  mkdirSync(dirname(outputPath), { recursive: true });
  const outputFd = openSync(outputPath, 'a+');

  try {
    const output = fstatSync(outputFd);
    if (output.size > 0 && output.mtimeMs >= statSync(sourcePath).mtimeMs) {
      return;
    }

    const source = getSource();
    ftruncateSync(outputFd, 0);
    writeFileSync(outputFd, source, 'utf8');
  } finally {
    closeSync(outputFd);
  }
};

const prepareRuntimeTestGraph = (entryFile: string) => {
  const projectRoot = process.cwd();
  const resolvedEntryFile = resolve(projectRoot, entryFile);
  const relativeEntryFile = relative(projectRoot, resolvedEntryFile);
  const runtimeRoot = join(projectRoot, '.pokujs-vue-runtime');
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

      if (resolvedPath.endsWith('.vue')) {
        source = rewriteVueImportSpecifier(source, specifier, resolvedPath);
      }
    }

    if (moduleExtension === '.vue') {
      writeRuntimeModule(
        join(runtimeRoot, `${relativePath}.js`),
        modulePath,
        () => compileVueSfcModuleSync(source, modulePath)
      );
      return;
    }

    writeRuntimeModule(
      join(runtimeRoot, relativePath),
      modulePath,
      () => source
    );
  };

  emitModule(resolvedEntryFile);

  return join(runtimeRoot, relativeEntryFile);
};

export const buildRunnerCommand = (
  input: Omit<BuildRunnerCommandInput, 'extensions'>
) => {
  const runtime = input.runtime;
  const runtimeFile =
    runtime === 'bun' || runtime === 'deno'
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
