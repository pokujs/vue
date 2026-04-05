import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileVueSfcModule } from './vue-sfc-loader.ts';

const isVueSpecifier = (specifier: string) => specifier.endsWith('.vue');
const isVueUrl = (url: string) => url.endsWith('.vue');

export const resolve = async (
  specifier: string,
  context: { parentURL?: string },
  nextResolve: (specifier: string, context: { parentURL?: string }) => Promise<{ url: string }>
) => {
  if (!isVueSpecifier(specifier)) {
    return nextResolve(specifier, context);
  }

  const parentUrl = context.parentURL || pathToFileURL(`${process.cwd()}/`).href;
  return {
    shortCircuit: true,
    url: new URL(specifier, parentUrl).href,
  };
};

export const load = async (
  url: string,
  context: { format?: string | null },
  nextLoad: (url: string, context: { format?: string | null }) => Promise<{ format: string | null | undefined; source?: string | Buffer }>
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