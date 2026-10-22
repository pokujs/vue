import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileVueSfcModule } from './vue-sfc-loader.ts';

const isVueSpecifier = (specifier: string) => specifier.endsWith('.vue');
const isVueUrl = (url: string) => url.endsWith('.vue');

const tryResolveExtensionlessVueUrl = (
  specifier: string,
  parentUrl: string
): string | null => {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return null;
  if (extname(specifier) !== '') return null;

  try {
    const baseUrl = new URL(specifier, parentUrl);
    if (baseUrl.protocol !== 'file:') return null;
    const basePath = fileURLToPath(baseUrl);

    for (const suffix of ['.vue', '/index.vue']) {
      const candidate = `${basePath.replace(/\/$/, '')}${suffix}`;
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        return pathToFileURL(candidate).href;
      }
    }
  } catch {
    // Fall through
  }

  return null;
};

export const resolve = async (
  specifier: string,
  context: { parentURL?: string },
  nextResolve: (
    specifier: string,
    context: { parentURL?: string }
  ) => Promise<{ url: string }>
) => {
  const parentUrl =
    context.parentURL || pathToFileURL(`${process.cwd()}/`).href;

  if (isVueSpecifier(specifier)) {
    return {
      shortCircuit: true,
      url: new URL(specifier, parentUrl).href,
    };
  }

  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const vueUrl = tryResolveExtensionlessVueUrl(specifier, parentUrl);
    if (vueUrl) {
      return {
        shortCircuit: true,
        url: vueUrl,
      };
    }
    throw error;
  }
};

export const load = async (
  url: string,
  context: { format?: string | null },
  nextLoad: (
    url: string,
    context: { format?: string | null }
  ) => Promise<{ format: string | null | undefined; source?: string | Buffer }>
) => {
  if (!isVueUrl(url)) {
    return nextLoad(url, context);
  }

  const absolutePath = fileURLToPath(url);
  const source = await readFile(absolutePath, 'utf8');
  const compiledSource = await compileVueSfcModule(source, absolutePath);

  return {
    format: 'module',
    shortCircuit: true,
    source: compiledSource,
  };
};
