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
// eslint.config.js (Flat Config for ESLint v9+)
import js from '@eslint/js';
import tseslint from 'typescript-eslint'; // meta pkg: parser + plugin + configs
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import configPrettier from 'eslint-config-prettier';

// Normalize presets to arrays so we can safely spread them regardless of version shape
const jsRecommended = Array.isArray(js.configs.recommended)
  ? js.configs.recommended
  : [js.configs.recommended];

const tsRecommended = Array.isArray(tseslint.configs.recommended)
  ? tseslint.configs.recommended
  : [tseslint.configs.recommended];

const prettierFlat = Array.isArray(configPrettier)
  ? configPrettier
  : [configPrettier];

export default [
  // 1) Ignore build output
  { ignores: ['dist/**'] },

  // 2) Base JS rules
  ...jsRecommended,

  // 3) Base TS rules
  ...tsRecommended,

  // 4) Project rules/plugins/globals
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        window: 'readonly',
        document: 'readonly',
        chrome: 'readonly',
        navigator: 'readonly',
        crypto: 'readonly',
      },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // React (no need for React in scope w/ new JSX transform)
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    linterOptions: { reportUnusedDisableDirectives: true },
  },

  // 5) Prettier last
  ...prettierFlat,
];
