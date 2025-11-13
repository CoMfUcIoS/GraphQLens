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
// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ gql_rules: [], gql_enabled: false });
});

// Store active devtools connections by tab ID
const devtoolsPorts = new Map<number, chrome.runtime.Port>();

// Handle rules RPCs
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'GQLENS_GET_RULES') {
    chrome.storage.local.get(['gql_rules', 'gql_enabled'], (v) =>
      sendResponse(v),
    );
    return true; // async response
  }
  if (msg?.type === 'GQLENS_SET_RULES') {
    chrome.storage.local.set({ gql_rules: msg.rules });
  }
  if (msg?.type === 'GQLENS_MOCKED_REQUEST') {
    // Forward mocked request to devtools for this tab
    const tabId = sender.tab?.id;
    if (tabId && devtoolsPorts.has(tabId)) {
      const port = devtoolsPorts.get(tabId);
      port?.postMessage({
        type: 'MOCKED_REQUEST',
        payload: msg.payload,
      });
    }
  }
  if (msg?.type === 'GQLENS_REGISTER_DEVTOOLS') {
    // Store the association between port and tab
    sendResponse({ success: true });
    return true;
  }
});

// Devtools port connection handling
chrome.runtime.onConnect.addListener((p) => {
  if (p.name !== 'devtools') return;

  // Listen for registration message with tabId
  p.onMessage.addListener((msg) => {
    if (msg?.type === 'REGISTER' && msg?.tabId) {
      devtoolsPorts.set(msg.tabId, p);
    }
  });

  p.onDisconnect.addListener(() => {
    // Remove port from all tab associations
    for (const [tabId, port] of devtoolsPorts.entries()) {
      if (port === p) {
        devtoolsPorts.delete(tabId);
      }
    }
  });
});

// Wrap sendMessage calls as well:
export function safeSend(tabId: number, payload: unknown) {
  try {
    chrome.tabs.sendMessage(tabId, payload, () => {
      // swallow BFCache/channel-closed errors
      const lastErr = chrome.runtime.lastError;
      if (
        lastErr &&
        !String(lastErr.message).includes('message channel is closed')
      ) {
        console.warn('sendMessage error:', lastErr.message);
      }
    });
  } catch {
    // intentionally empty: ignore errors from sendMessage
  }
}
