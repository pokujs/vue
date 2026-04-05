import { transform } from 'esbuild';
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc';

const DEFAULT_COMPONENT_EXPORT = 'const __sfc__ = {}\n';

export const compileVueSfcModule = async (
  source: string,
  absolutePath: string
) => {
  const { descriptor, errors } = parse(source, {
    filename: absolutePath,
  });

  if (errors.length > 0) {
    const firstError = errors[0];
    throw new Error(
      `Failed to parse SFC at ${absolutePath}: ${String(firstError)}`
    );
  }

  const scriptResult = descriptor.script || descriptor.scriptSetup
    ? compileScript(descriptor, {
        id: absolutePath,
        genDefaultAs: '__sfc__',
      })
    : null;

  let moduleCode = scriptResult
    ? scriptResult.content
    : DEFAULT_COMPONENT_EXPORT;

  if (descriptor.template) {
    const templateResult = compileTemplate(
      scriptResult?.bindings
        ? {
            id: absolutePath,
            filename: absolutePath,
            source: descriptor.template.content,
            compilerOptions: {
              bindingMetadata: scriptResult.bindings,
            },
          }
        : {
            id: absolutePath,
            filename: absolutePath,
            source: descriptor.template.content,
          }
    );

    if (templateResult.errors.length > 0) {
      const firstError = templateResult.errors[0];
      throw new Error(
        `Failed to compile template at ${absolutePath}: ${String(firstError)}`
      );
    }

    moduleCode += `\n${templateResult.code}\n__sfc__.render = render\n`;
  }

  if (descriptor.styles.length > 0) {
    moduleCode += '\n/* Vue test SFC styles intentionally ignored at runtime. */\n';
  }

  moduleCode += '\nexport default __sfc__\n';

  const transpiled = await transform(moduleCode, {
    loader: 'ts',
    format: 'esm',
    target: 'es2022',
    sourcemap: false,
    sourcefile: absolutePath,
  });

  return transpiled.code;
};