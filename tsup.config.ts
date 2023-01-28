import { defineConfig } from 'tsup';

export default defineConfig({
  entryPoints: ['src/index.ts'],
  outDir: 'dist',
  dts: true,
  clean: true,
  platform: 'node',
  shims: true,
});