/**
 * Copyright (c) 2025 Ioannis Karasavvaidis
 * This file is part of GraphQLens
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import manifest from './extension/manifest.json';

// __dirname is not defined in ESM; define it explicitly
const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [crx({ manifest })],
  resolve: {
    alias: {
      // @ → src
      '@': resolve(__dirname, 'src'),
      // @devtools → src/devtools
      '@devtools': resolve(__dirname, 'src/devtools'),
    },
  },
  build: {
    sourcemap: false,
    outDir: 'dist',
    rollupOptions: {
      input: {
        devtools: resolve(__dirname, 'src/devtools/index.html'),
        // DevTools bootstrap (creates the panel)
        devtools_bootstrap: resolve(__dirname, 'src/devtools/devtools.html'),
        // add content script so it gets emitted as JS
        content: resolve(__dirname, 'src/content/index.ts'),
      },
    },
  },
  base: './', // important for extension URLs resolving chunks correctly
  server: {
    port: 5173,
    strictPort: true,
    cors: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      overlay: true, // keep overlay, but it won't spam console
    },
  },
});
