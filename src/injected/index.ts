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
/* global setTimeout */
// Minimal, safe fetch wrapper that only touches GraphQL POSTs when enabled
(function () {
  console.log('[GraphQLens] Fetch interceptor installed');

  const origFetch = window.fetch;
  async function shouldMock() {
    return new Promise((resolve) => {
      const onMsg = (e: MessageEvent) => {
        if (
          e.source === window &&
          typeof e.data === 'object' &&
          e.data !== null &&
          '__gqlens' in e.data &&
          (e.data as { __gqlens: string }).__gqlens === 'RULES'
        ) {
          window.removeEventListener('message', onMsg);
          resolve(e.data.payload ?? { gql_rules: [], gql_enabled: false });
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

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const mockResult = await shouldMock();
    const { gql_enabled, gql_rules } = mockResult as {
      gql_enabled: boolean;
      gql_rules: unknown[];
    };

    if (!gql_enabled || (init?.method ?? 'GET') !== 'POST')
      return origFetch(input, init);

    try {
      let url: string;
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof Request) {
        url = input.url;
      } else if (input instanceof URL) {
        url = input.toString();
      } else {
        url = '';
      }
      const text =
        init?.body && typeof init.body !== 'string'
          ? ''
          : String(init?.body ?? '');
      if (!/graphql/i.test(url) && !/"query"|persistedQuery/.test(text)) {
        return origFetch(input, init);
      }

      console.log('[GraphQLens] GraphQL request detected:', url);
      console.log('[GraphQLens] Request body:', text);
      console.log('[GraphQLens] Available rules:', gql_rules);

      // Parse the request body to get operation name and variables (robust against non-JSON formats)
      let requestOpName = '';
      let requestVariables: Record<string, unknown> = {};
      let parseMode = 'unknown';

      function safeJSONParse(str: string): unknown | undefined {
        try {
          return JSON.parse(str);
        } catch {
          return undefined;
        }
      }

      function deepEqual(a: unknown, b: unknown): boolean {
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
          if (a.length !== (b as unknown[]).length) return false;
          for (let i = 0; i < a.length; i++)
            if (!deepEqual(a[i], (b as unknown[])[i])) return false;
          return true;
        }
        const aKeys = Object.keys(a as Record<string, unknown>);
        const bKeys = Object.keys(b as Record<string, unknown>);
        if (aKeys.length !== bKeys.length) return false;
        for (const k of aKeys) {
          if (!bKeys.includes(k)) return false;
          // @ts-expect-error index access
          if (!deepEqual(a[k], b[k])) return false;
        }
        return true;
      }

      // Strategy: JSON object | URL-encoded form | raw GraphQL string
      const trimmed = text.trim();
      let parsed: unknown | undefined;
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
          varsObj && typeof varsObj === 'object'
            ? (varsObj as Record<string, unknown>)
            : ({} as Record<string, unknown>);
        parseMode = 'urlencoded';
      } else if (parsed) {
        if (Array.isArray(parsed)) {
          console.log(
            '[GraphQLens] Batched operations detected – skipping mock',
          );
          return origFetch(input, init);
        }
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'operationName' in parsed &&
          'variables' in parsed
        ) {
          requestOpName =
            (parsed as { operationName?: string }).operationName || '';
          requestVariables =
            (parsed as { variables?: Record<string, unknown> }).variables || {};
        }
      } else if (!parsed) {
        // Attempt to extract operation name from raw GraphQL query text (e.g. 'query GetAccountsForList {...')
        const opMatch = /(?:query|mutation|subscription)\s+(\w+)/.exec(trimmed);
        if (opMatch) {
          requestOpName = opMatch[1];
          parseMode = 'graphql-raw';
        }
      }
      console.log(
        '[GraphQLens] Parse mode:',
        parseMode,
        'operation:',
        requestOpName,
        'variables keys:',
        Object.keys(requestVariables),
      );

      // deepEqual already defined above

      // Find all matching rules and prioritize by specificity
      const matchingRules = gql_rules.filter((r: unknown) => {
        if (typeof r !== 'object' || r === null) return false;
        // Match if the endpoint is contained in the URL or vice versa
        const endpointMatch =
          url.includes(r.endpoint) ||
          r.endpoint.includes(url) ||
          new URL(r.endpoint, window.location.origin).pathname === url;

        // Strict operation name match (no fuzzy includes)
        const opMatch = !r.operationName || requestOpName === r.operationName;

        if (!endpointMatch || !opMatch) {
          return false;
        }

        // Match variables if specified in the rule
        if (r.variables && Object.keys(r.variables).length > 0) {
          // If we have no parsed variables, we cannot match a variable-specific rule
          if (!requestVariables || Object.keys(requestVariables).length === 0) {
            console.log(
              '[GraphQLens] Skip rule with variables due to unparsable request variables',
            );
            return false;
          }
          const variablesMatch = deepEqual(requestVariables, r.variables);
          console.log('[GraphQLens] Rule variable comparison:', {
            operation: r.operationName,
            endpoint: r.endpoint,
            ruleVariables: r.variables,
            requestVariables,
            match: variablesMatch,
          });
          return variablesMatch;
        }

        // Rule has no variables specified, it's a wildcard match
        console.log(
          '[GraphQLens] Rule has no variables (wildcard):',
          r.operationName,
        );
        return true;
      });

      // Prioritize rules with variables over wildcard rules
      const match = matchingRules.sort((a: unknown, b: unknown) => {
        const aHasVars =
          typeof a.variables === 'object' &&
          a.variables !== null &&
          Array.isArray(a.variables)
            ? a.variables.length > 0
            : typeof a.variables === 'object' &&
              a.variables !== null &&
              Object.keys(a.variables).length > 0;
        const bHasVars =
          typeof b.variables === 'object' &&
          b.variables !== null &&
          Array.isArray(b.variables)
            ? b.variables.length > 0
            : typeof b.variables === 'object' &&
              b.variables !== null &&
              Object.keys(b.variables).length > 0;

        // Rules with variables come first
        if (aHasVars && !bHasVars) return -1;
        if (!aHasVars && bHasVars) return 1;

        // If both have variables, prefer the one with more matching keys
        if (aHasVars && bHasVars) {
          return (
            (Array.isArray(b.variables)
              ? b.variables.length
              : Object.keys(b.variables).length) -
            (Array.isArray(a.variables)
              ? a.variables.length
              : Object.keys(a.variables).length)
          );
        }

        return 0;
      })[0];

      if (!match) {
        console.log('[GraphQLens] No matching rule found');
        return origFetch(input, init);
      }

      console.log('[GraphQLens] Mocking with rule:', match);

      // Notify devtools about the mocked request
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

      // Return the response as-is (it should already be in the correct format)
      interface GqlRule {
        response: unknown;
        statusCode: number;
        [key: string]: unknown;
      }
      const ruleMatch = match as GqlRule;
      const body = JSON.stringify(ruleMatch.response);
      return new Response(body, {
        status: ruleMatch.statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('GraphQLens mock error:', err);
      return origFetch(input, init);
    }
  };
})();
