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
// Inject our script to hook fetch when mocking is enabled.
const s = document.createElement('script');
// Let CRXJS resolve this TS path to the built JS chunk
// IMPORTANT: inject compiled JS, not raw TypeScript (raw TS breaks in-page execution)
const scriptUrl = chrome.runtime.getURL('src/injected/index.js');
s.src = scriptUrl;
s.dataset.gqlens = '1';
console.log('[GraphQLens] Injecting script:', scriptUrl);
(document.head || document.documentElement).appendChild(s);
s.remove();

// Bridge: respond to the injected page's PING with stored rules
window.addEventListener('message', async (evt) => {
  if (!evt || evt.source !== window) return;

  if (evt.data?.__gqlens === 'PING') {
    try {
      chrome.runtime.sendMessage({ type: 'GQLENS_GET_RULES' }, (response) => {
        // Check for errors
        if (chrome.runtime.lastError) {
          console.warn(
            'GraphQLens: Failed to get rules',
            chrome.runtime.lastError,
          );
          window.postMessage(
            {
              __gqlens: 'RULES',
              payload: { gql_rules: [], gql_enabled: false },
            },
            '*',
          );
          return;
        }

        window.postMessage(
          {
            __gqlens: 'RULES',
            payload: response || { gql_rules: [], gql_enabled: false },
          },
          '*',
        );
      });
    } catch (err) {
      console.error('GraphQLens: Error in content script', err);
      window.postMessage(
        { __gqlens: 'RULES', payload: { gql_rules: [], gql_enabled: false } },
        '*',
      );
    }
  }

  // Forward mocked request notifications to devtools
  if (evt.data?.__gqlens === 'MOCKED_REQUEST') {
    try {
      chrome.runtime.sendMessage({
        type: 'GQLENS_MOCKED_REQUEST',
        payload: evt.data.payload,
      });
    } catch (err) {
      console.error('GraphQLens: Error forwarding mocked request', err);
    }
  }
});
