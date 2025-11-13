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
// Monaco worker wiring (Vite)
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

// @ts-expect-error global
self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'json') return new jsonWorker();
    return new editorWorker();
  },
};

import * as monaco from 'monaco-editor';
// --- Monaco editor lifecycle helpers ---------------------------------------
const editors = new Set<monaco.editor.IStandaloneCodeEditor>();
export function createEditor(
  container: HTMLElement,
  opts: monaco.editor.IStandaloneEditorConstructionOptions,
) {
  const ed = monaco.editor.create(container, opts);
  editors.add(ed);
  ed.onDidDispose(() => editors.delete(ed));
  return ed;
}

function disposeAllEditors() {
  for (const ed of Array.from(editors)) {
    try {
      ed.getModel()?.dispose();
    } catch {
      // intentionally empty: ignore errors from dispose
    }
    try {
      ed.dispose();
    } catch {
      // intentionally empty: ignore errors from dispose
    }
  }
  editors.clear();
}

// Swallow expected Monaco "Canceled" rejections in DEV (HMR / fast nav)
if (import.meta.env.DEV) {
  window.addEventListener('unhandledrejection', (e) => {
    const msg = String(e.reason?.message || e.reason || '');
    if (msg.includes('Canceled')) e.preventDefault();
  });
}

// Cooperate with Vite HMR: dispose before updates / on prune
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', disposeAllEditors);
  import.meta.hot.prune(disposeAllEditors);
}

import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
