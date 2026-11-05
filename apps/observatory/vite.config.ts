// Builds the office page into .work/office-dist (ignored). Run: npx vite build --config apps/observatory/vite.config.ts
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  root: resolve(root, 'apps/web/src/annex'), base: './', publicDir: resolve(root, 'apps/web/public/workshop-pixel'), plugins: [react()],
  build: {outDir: resolve(root, '.work/office-dist'), emptyOutDir: true}
});
