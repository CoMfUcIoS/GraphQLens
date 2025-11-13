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
let port: chrome.runtime.Port | null = null;
let connecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 20;

function connectPort() {
  if (connecting) return;
  connecting = true;
  try {
    port = chrome.runtime.connect({ name: 'devtools' });
    reconnectAttempts = 0;
    connecting = false;
    // Register this devtools with the inspected tab
    try {
      port.postMessage({
        type: 'REGISTER',
        tabId: chrome.devtools.inspectedWindow.tabId,
      });
    } catch {
      // intentionally empty: ignore errors from port.postMessage
    }
    attachListeners();
    if (port) {
      port.onDisconnect.addListener(() => {
        scheduleReconnect('disconnect');
      });
    }
  } catch (err: unknown) {
    connecting = false;
    scheduleReconnect('connect-error', err?.message);
  }
}

function scheduleReconnect(reason: string, detail?: string) {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('[GraphQLens] Port reconnect aborted after max attempts', {
      reason,
      detail,
    });
    return;
  }
  const delay = Math.min(500 + reconnectAttempts * 300, 5000);
  reconnectAttempts += 1;
  setTimeout(() => {
    connectPort();
  }, delay);
}

function reconnectPort() {
  try {
    port?.disconnect();
  } catch {
    // intentionally empty: ignore errors from disconnect
  }
  port = null;
  connectPort();
}

// Establish initial port
connectPort();

window.addEventListener('pageshow', (e) => {
  if ((e as PageTransitionEvent).persisted) reconnectPort();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') reconnectPort();
});

export function safePostMessage() {
  if (!port) {
    reconnectPort();
    return;
  }
  // _msg is intentionally unused; kept for API compatibility
  try {
    port.postMessage(undefined);
  } catch (err: unknown) {
    const m = String((err as unknown as { message?: string })?.message || '');
    if (
      /Extension context invalidated/i.test(m) ||
      /message channel is closed/i.test(m)
    ) {
      console.warn('[GraphQLens] Port invalidated, scheduling reconnect');
      reconnectPort();
      return;
    }
    console.warn('[GraphQLens] postMessage throw', m);
  }
  // @ts-expect-error Chrome lastError may exist
  const lastErr = chrome.runtime.lastError;
  if (lastErr) {
    const m = String(lastErr.message || '');
    if (
      /message channel is closed/i.test(m) ||
      /Extension context invalidated/i.test(m)
    ) {
      reconnectPort();
    } else {
      console.warn('[GraphQLens] postMessage lastError:', m);
    }
  }
}

// Message listeners
const messageListeners = new Set<(msg: unknown) => void>();

function attachListeners() {
  if (!port) return;
  // Avoid attaching multiple times: clear existing listeners by recreating collection? Chrome API doesn't expose removal of anonymous, so rely on new port instance.
  port.onMessage.addListener((_msg) => {
    // _msg is intentionally unused; kept for API compatibility
    messageListeners.forEach((listener) => listener(_msg));
  });
}

attachListeners();

export function onPortMessage(listener: (_msg: unknown) => void) {
  messageListeners.add(listener);
  return () => messageListeners.delete(listener);
}
