// Builds the "Your Turn" page into .work/turn-dist (ignored). Run: node node_modules/vite/bin/vite.js build --config apps/turn/vite.config.ts
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  root: resolve(root, 'apps/turn/web'), base: './', plugins: [react()],
  build: {outDir: resolve(root, '.work/turn-dist'), emptyOutDir: true},
});
