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
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Entry } from '@/types/shared';
import RequestList from './RequestList';
import RequestPanel from './RequestPanel';
import RuleModal from '../rules/RuleModal';
import { Input } from '../../components/ui/input';
import { onPortMessage } from '../../app/port';
import { EmptyState } from '../../components/EmptyState';
import { ListSkeleton } from '../../components/Skeleton';
import { Alert } from '../../components/Alert';
import {
  useStatusStore,
  useRequestsStatus,
  useStatusError,
} from '../../state/statusStore';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useDebounce } from '../../lib/useDebounce';

type Rule = {
  id: string;
  operationName: string;
  endpoint: string;
  statusCode: number;
  response: unknown;
  variables?: Record<string, unknown>;
};

export default function RequestsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const requestsStatus = useRequestsStatus();
  const setStatus = useStatusStore((s) => s.setStatus);
  const setError = useStatusStore((s) => s.setError);
  const clearError = useStatusStore((s) => s.clearError);
  const error = useStatusError('requests');
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [mockingEnabled, setMockingEnabled] = useState(false);
  const [ruleInitialData, setRuleInitialData] = useState<{
    operationName: string;
    endpoint: string;
    response: string;
    variables?: string;
  } | null>(null);
  const [ruleAlert, setRuleAlert] = useState<{
    variant: 'error' | 'success';
    message: string;
  } | null>(null);
  const debouncedFilter = useDebounce(filterText);
  const filteredEntries = useMemo(() => {
    if (!debouncedFilter.trim()) return entries;
    const q = debouncedFilter.toLowerCase();
    return entries.filter((e) => {
      const url = e.har?.request?.url?.toLowerCase() || '';
      const body = e.har?.request?.postData?.text || '';
      let op = '';
      try {
        const j = JSON.parse(body);
        if (Array.isArray(j)) {
          op = j
            .map((x) => x?.operationName)
            .filter(Boolean)
            .join(',');
        } else {
          op = j?.operationName || '';
        }
      } catch {
        /* ignore */
      }
      return url.includes(q) || op.toLowerCase().includes(q);
    });
  }, [entries, debouncedFilter]);

  const selectedEntry = useMemo(
    () => filteredEntries.find((e) => e.id === selected) ?? null,
    [filteredEntries, selected],
  );

  // Open rule modal with initial data instead of immediate creation
  const handleCreateRule = useCallback(
    (data: {
      operationName: string;
      endpoint: string;
      response: string;
      variables?: string;
    }) => {
      setRuleInitialData(data);
      setRuleModalOpen(true);
    },
    [],
  );

  // Keyboard navigation for request list (↑ / ↓ / Enter)
  useEffect(() => {
    function keyHandler(e: KeyboardEvent) {
      if (filteredEntries.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((prev) => {
          if (!prev) return filteredEntries[0].id;
          const idx = filteredEntries.findIndex((x) => x.id === prev);
          const nextIdx = Math.min(filteredEntries.length - 1, idx + 1);
          return filteredEntries[nextIdx].id;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((prev) => {
          if (!prev) return filteredEntries[0].id;
          const idx = filteredEntries.findIndex((x) => x.id === prev);
          const nextIdx = Math.max(0, idx - 1);
          return filteredEntries[nextIdx].id;
        });
      } else if (e.key === 'Enter') {
        if (selectedEntry) {
          const operationName = (() => {
            try {
              return (
                JSON.parse(selectedEntry.har.request.postData?.text || '')
                  .operationName || ''
              );
            } catch {
              return '';
            }
          })();
          const variables = (() => {
            try {
              const j = JSON.parse(
                selectedEntry.har.request.postData?.text || '',
              );
              return j.variables
                ? JSON.stringify(j.variables, null, 2)
                : undefined;
            } catch {
              return undefined;
            }
          })();
          handleCreateRule({
            operationName,
            endpoint: selectedEntry.har.request.url,
            response: selectedEntry.body || '{}',
            variables,
          });
        }
      }
    }
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [filteredEntries, selectedEntry, handleCreateRule]);

  // Load rules and mocking status
  // Derive status from entries with a gentle delay for skeleton display
  useEffect(() => {
    if (entries.length > 0) {
      setStatus('requests', 'ready');
      return;
    }
    // show loading at first mount then transition to empty
    const t = setTimeout(() => {
      if (entries.length === 0) setStatus('requests', 'empty');
    }, 1200);
    return () => clearTimeout(t);
  }, [entries, setStatus]);

  useEffect(() => {
    const loadRulesAndStatus = () => {
      chrome.runtime.sendMessage({ type: 'GQLENS_GET_RULES' }, (v) => {
        if (chrome.runtime.lastError) {
          setError('requests', 'Failed to load rules context.');
        } else {
          clearError('requests');
          setRules(v?.gql_rules ?? []);
        }
      });
      chrome.storage.local.get(['gql_enabled'], (v) => {
        setMockingEnabled(Boolean(v?.gql_enabled));
      });
    };

    loadRulesAndStatus();

    // Poll for updates
    const interval = setInterval(loadRulesAndStatus, 2000);

    return () => clearInterval(interval);
  }, [setError, clearError]);

  // Listen for mocked requests from background script
  useEffect(() => {
    type MockedRequestMsg = {
      type: 'MOCKED_REQUEST';
      payload: {
        url: string;
        body: string;
        response: unknown;
        statusCode: number;
      };
    };
    const unsubscribe = onPortMessage((msg: unknown) => {
      if (
        typeof msg === 'object' &&
        msg !== null &&
        (msg as MockedRequestMsg).type === 'MOCKED_REQUEST'
      ) {
        const {
          url,
          body: requestBody,
          response,
          statusCode,
        } = (msg as MockedRequestMsg).payload;

        // Create a mock HAR entry for the mocked request
        const mockHar = {
          request: {
            url,
            method: 'POST',
            postData: { text: requestBody },
          },
          response: {
            status: statusCode,
            statusText: 'Mocked',
          },
        } as chrome.devtools.network.Request;

        const id = crypto.randomUUID();
        const responseBody = JSON.stringify(response, null, 2);

        setEntries((prev) => {
          const item: Entry = {
            id,
            har: mockHar,
            body: responseBody,
            originalBody: undefined,
            transformedBody: responseBody,
            durationMs: 0,
            isMocked: true,
          };
          const next = [...prev, item];
          if (!selected) setSelected(id);
          return next;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selected]);

  useEffect(() => {
    const listener = (req: chrome.devtools.network.Request) => {
      try {
        const body = req.request?.postData?.text ?? '';
        if (body && (/"query"/.test(body) || /persistedQuery/.test(body))) {
          const id = crypto.randomUUID();
          type ReqWithStarted = chrome.devtools.network.Request & {
            startedDateTime?: string;
          };
          const startedDateTime = (req as ReqWithStarted).startedDateTime;
          const started = startedDateTime
            ? new Date(startedDateTime).getTime()
            : undefined;
          req.getContent((body) => {
            setEntries((prev) => {
              const now = Date.now();
              const item: Entry = {
                id,
                har: req,
                body,
                originalBody: body,
                transformedBody: body,
                durationMs: started ? Math.max(0, now - started) : undefined,
              };
              const next = [...prev, item];
              if (!selected) setSelected(id);
              return next;
            });
          });
        }
      } catch {
        // intentionally empty
      }
    };

    const navigationListener = () => {
      setEntries([]);
      setSelected(null);
    };

    chrome.devtools.network.onRequestFinished.addListener(listener);
    chrome.devtools.network.onNavigated.addListener(navigationListener);

    return () => {
      chrome.devtools.network.onRequestFinished.removeListener(listener);
      chrome.devtools.network.onNavigated.removeListener(navigationListener);
    };
  }, [selected]);

  // Update isMocked status when rules or mocking status changes
  useEffect(() => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (!mockingEnabled || rules.length === 0) {
          return { ...entry, isMocked: false };
        }

        try {
          const url = entry.har?.request?.url ?? '';
          const body = entry.har?.request?.postData?.text ?? '';

          let requestOpName = '';
          let requestVariables: Record<string, unknown> = {};
          try {
            const parsed = JSON.parse(body);
            if (Array.isArray(parsed)) {
              // Do not attempt mock classification for batched operations
              return { ...entry, isMocked: false };
            }
            requestOpName = parsed.operationName || '';
            requestVariables = parsed.variables || {};
          } catch {
            return { ...entry, isMocked: false };
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

          // Find all matching rules and prioritize by specificity
          const matchingRules = rules.filter((r) => {
            const endpointMatch =
              url.includes(r.endpoint) || r.endpoint.includes(url);
            const opMatch =
              !r.operationName || requestOpName === r.operationName; // strict match

            if (!endpointMatch || !opMatch) {
              return false;
            }

            // Match variables if specified in the rule
            if (r.variables && Object.keys(r.variables).length > 0) {
              return deepEqual(requestVariables, r.variables);
            }

            // Rule has no variables specified, it's a wildcard match
            return true;
          });

          // Prioritize rules with variables over wildcard rules
          const isMocked =
            matchingRules.sort((a, b) => {
              const aVarCount = a.variables
                ? Object.keys(a.variables).length
                : 0;
              const bVarCount = b.variables
                ? Object.keys(b.variables).length
                : 0;
              if (aVarCount && !bVarCount) return -1;
              if (!aVarCount && bVarCount) return 1;
              if (aVarCount && bVarCount) return bVarCount - aVarCount;
              return 0;
            }).length > 0;

          return { ...entry, isMocked };
        } catch {
          return { ...entry, isMocked: false };
        }
      }),
    );
  }, [rules, mockingEnabled]);

  // Derived metrics
  const metrics = useMemo(() => {
    const total = entries.length;
    const mocked = entries.filter((e) => e.isMocked).length;
    const real = total - mocked;
    const durations = entries
      .map((e) => e.durationMs)
      .filter((d): d is number => typeof d === 'number');
    const avgDuration = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;
    const avgResponseSize = (() => {
      const sizes = entries
        .map((e) => (e.transformedBody || e.body || '').length)
        .filter((s) => s > 0);
      if (!sizes.length) return null;
      return Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length);
    })();
    return { total, mocked, real, avgDuration, avgResponseSize };
  }, [entries]);

  return (
    <div className="h-full grid grid-cols-[320px_1fr]">
      <div className="border-r border-border flex flex-col">
        <div className="p-2 flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Filter by operation or URL…"
              className="h-8"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <span
              className="text-xs px-2 py-1 rounded bg-muted"
              aria-live="polite"
            >
              {filteredEntries.length} request
              {filteredEntries.length === 1 ? '' : 's'}
            </span>
          </div>
          <div
            className="flex flex-wrap gap-2 text-[11px] leading-tight"
            aria-label="Request metrics"
            aria-live="polite"
          >
            <span className="px-2 py-1 rounded bg-muted/60">
              Total: {metrics.total}
            </span>
            <span className="px-2 py-1 rounded bg-muted/60">
              Mocked: {metrics.mocked}
            </span>
            <span className="px-2 py-1 rounded bg-muted/60">
              Real: {metrics.real}
            </span>
            {metrics.avgDuration !== null && (
              <span
                className="px-2 py-1 rounded bg-muted/60"
                title="Average captured duration"
              >
                Avg ms: {metrics.avgDuration}
              </span>
            )}
            {metrics.avgResponseSize !== null && (
              <span
                className="px-2 py-1 rounded bg-muted/60"
                title="Average transformed response size (chars)"
              >
                Avg size: {metrics.avgResponseSize}
              </span>
            )}
          </div>
          {error && (
            <Alert
              variant="error"
              title="Load issue"
              description={error}
              action={
                <button
                  className="text-xs underline"
                  onClick={() => {
                    clearError('requests');
                    setStatus('requests', 'loading');
                  }}
                >
                  Retry
                </button>
              }
              onClose={() => clearError('requests')}
            />
          )}
          {ruleAlert && (
            <Alert
              variant={ruleAlert.variant}
              description={ruleAlert.message}
              onClose={() => setRuleAlert(null)}
            />
          )}
        </div>
        <div className="flex-1 overflow-auto" aria-live="polite">
          {requestsStatus === 'loading' ? (
            <ListSkeleton rows={8} />
          ) : requestsStatus === 'empty' ? (
            <EmptyState
              title="No GraphQL requests captured"
              description={
                'Trigger a GraphQL query in the inspected page.\nOnce detected, it will appear here.'
              }
            />
          ) : (
            <RequestList
              entries={filteredEntries}
              selectedId={selected}
              onSelect={setSelected}
            />
          )}
        </div>
      </div>
      <div className="min-w-0">
        {selectedEntry ? (
          <ErrorBoundary label="Request Panel">
            <RequestPanel
              entry={selectedEntry}
              onCreateRule={handleCreateRule}
            />
          </ErrorBoundary>
        ) : (
          <EmptyState
            title="Select a request"
            description="Choose an item on the left to inspect its query, variables and response."
            className="h-full"
          />
        )}
      </div>
      <RuleModal
        open={ruleModalOpen}
        setOpen={setRuleModalOpen}
        onCreate={(rule) => {
          setRuleInitialData(null);
          // Optimistically update local rules list
          setRules((prev) =>
            prev.some((r) => r.id === rule.id) ? prev : [...prev, rule],
          );
          setRuleAlert({
            variant: 'success',
            message: 'Rule created successfully',
          });
        }}
        initialData={ruleInitialData}
      />
    </div>
  );
}
