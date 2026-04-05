import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: resolve(process.cwd(), 'tests/sfc/.dist'),
    emptyOutDir: true,
    lib: {
      entry: resolve(process.cwd(), 'tests/sfc/fixtures-entry.ts'),
      formats: ['es'],
      fileName: () => 'fixtures.js',
    },
    rollupOptions: {
      external: ['vue'],
    },
  },
});
