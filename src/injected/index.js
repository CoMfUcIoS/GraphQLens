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
/* global setTimeout, console, URLSearchParams, URL, Response */

// Minimal, safe fetch wrapper that only touches GraphQL POSTs when enabled
(function () {
  try {
    console.log('[GraphQLens] Fetch interceptor installed');
  } catch {
    /* noop */
  }

  const origFetch = window.fetch;
  async function shouldMock() {
    return new Promise((resolve) => {
      const onMsg = (e) => {
        if (e.source === window && e.data && e.data.__gqlens === 'RULES') {
          window.removeEventListener('message', onMsg);
          resolve(e.data.payload || { gql_rules: [], gql_enabled: false });
        }
      };
      window.addEventListener('message', onMsg);
      window.postMessage({ __gqlens: 'PING' }, '*');
      // safety timeout
      setTimeout(() => {
        window.removeEventListener('message', onMsg);
        resolve({ gql_rules: [], gql_enabled: false });
      }, 250);
    });
  }

  window.fetch = async function (input, init) {
    const { gql_enabled, gql_rules } = await shouldMock();

    if (!gql_enabled || ((init && init.method) || 'GET') !== 'POST') {
      return origFetch(input, init);
    }

    try {
      const url = typeof input === 'string' ? input : input.url;
      const text =
        init && init.body && typeof init.body !== 'string'
          ? ''
          : String((init && init.body) || '');
      if (!/graphql/i.test(url) && !/"query"|persistedQuery/.test(text)) {
        return origFetch(input, init);
      }

      try {
        console.log('[GraphQLens] GraphQL request detected:', url);
      } catch {
        /* noop */
      }
      try {
        console.log('[GraphQLens] Request body:', text);
      } catch {
        /* noop */
      }
      try {
        console.log('[GraphQLens] Available rules:', gql_rules);
      } catch {
        /* noop */
      }

      // Parse the request body to get operation name and variables (robust against non-JSON formats)
      let requestOpName = '';
      let requestVariables = {};
      let parseMode = 'unknown';

      function safeJSONParse(str) {
        try {
          return JSON.parse(str);
        } catch {
          return undefined;
        }
      }

      function deepEqual(a, b) {
        if (a === b) return true;
        if (
          typeof a !== 'object' ||
          typeof b !== 'object' ||
          a == null ||
          b == null
        )
          return false;
        if (Array.isArray(a) !== Array.isArray(b)) return false;
        if (Array.isArray(a) && Array.isArray(b)) {
          if (a.length !== b.length) return false;
          for (let i = 0; i < a.length; i++)
            if (!deepEqual(a[i], b[i])) return false;
          return true;
        }
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        for (const k of aKeys) {
          if (!bKeys.includes(k)) return false;
          if (!deepEqual(a[k], b[k])) return false;
        }
        return true;
      }

      // Strategy: JSON object | URL-encoded form | raw GraphQL string
      const trimmed = text.trim();
      let parsed;
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        parsed = safeJSONParse(trimmed);
        parseMode = 'json';
      }
      if (
        !parsed &&
        trimmed.includes('=') &&
        /operationName=|query=/.test(trimmed)
      ) {
        // Attempt URL-encoded parsing
        const params = new URLSearchParams(trimmed);
        const op = params.get('operationName') || '';
        const varsRaw = params.get('variables');
        const varsObj = varsRaw ? safeJSONParse(varsRaw) : undefined;
        requestOpName = op;
        requestVariables =
          varsObj && typeof varsObj === 'object' ? varsObj : {};
        parseMode = 'urlencoded';
      } else if (parsed) {
        if (Array.isArray(parsed)) {
          try {
            console.log(
              '[GraphQLens] Batched operations detected – skipping mock',
            );
          } catch {
            /* noop */
          }
          return origFetch(input, init);
        }
        requestOpName = parsed.operationName || '';
        requestVariables = parsed.variables || {};
      } else if (!parsed) {
        const opMatch = /(?:query|mutation|subscription)\s+(\w+)/.exec(trimmed);
        if (opMatch) {
          requestOpName = opMatch[1];
          parseMode = 'graphql-raw';
        }
      }
      try {
        console.log(
          '[GraphQLens] Parse mode:',
          parseMode,
          'operation:',
          requestOpName,
          'variables keys:',
          Object.keys(requestVariables),
        );
      } catch {
        /* noop */
      }

      const matchingRules = gql_rules.filter((r) => {
        try {
          const endpointMatch =
            url.includes(r.endpoint) ||
            r.endpoint.includes(url) ||
            new URL(r.endpoint, window.location.origin).pathname === url;
          const opMatch = !r.operationName || requestOpName === r.operationName;
          if (!endpointMatch || !opMatch) return false;
          if (r.variables && Object.keys(r.variables).length > 0) {
            if (!requestVariables || Object.keys(requestVariables).length === 0)
              return false;
            return deepEqual(requestVariables, r.variables);
          }
          return true;
        } catch {
          return false;
        }
      });

      const match = matchingRules.sort((a, b) => {
        const aHasVars = a.variables && Object.keys(a.variables).length > 0;
        const bHasVars = b.variables && Object.keys(b.variables).length > 0;
        if (aHasVars && !bHasVars) return -1;
        if (!aHasVars && bHasVars) return 1;
        if (aHasVars && bHasVars) {
          return (
            Object.keys(b.variables).length - Object.keys(a.variables).length
          );
        }
        return 0;
      })[0];

      if (!match) {
        try {
          console.log('[GraphQLens] No matching rule found');
        } catch {
          /* noop */
        }
        return origFetch(input, init);
      }

      try {
        console.log('[GraphQLens] Mocking with rule:', match);
      } catch {
        /* noop */
      }

      window.postMessage(
        {
          __gqlens: 'MOCKED_REQUEST',
          payload: {
            url,
            body: text,
            response: match.response,
            statusCode: match.statusCode,
            timestamp: Date.now(),
          },
        },
        '*',
      );

      const body = JSON.stringify(match.response);
      return new Response(body, {
        status: match.statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      try {
        console.error('GraphQLens mock error:', err);
      } catch {
        /* noop */
      }
      return origFetch(input, init);
    }
  };
})();
