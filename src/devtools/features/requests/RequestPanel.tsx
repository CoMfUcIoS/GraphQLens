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
import CodeView from '../../components/CodeView';
import { Button } from '../../components/ui/button';
import { StatusBadge, OperationBadge } from '../../components/StatusBadge';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../components/ui/tabs';
import React, { useMemo } from 'react';

type Entry = {
  har: {
    request: {
      url: string;
      postData?: { text?: string };
    };
  };
  body?: string;
  originalBody?: string;
  transformedBody?: string;
  isMocked?: boolean;
};

type RequestPanelProps = {
  entry: Entry;
  onCreateRule?: (_data: {
    operationName: string;
    endpoint: string;
    response: string;
    variables?: string;
  }) => void;
};

function RequestPanel({ entry, onCreateRule }: RequestPanelProps) {
  const raw = entry.har.request?.postData?.text ?? '';
  const vars = (() => {
    try {
      const j = JSON.parse(raw);
      return JSON.stringify(j.variables ?? {}, null, 2);
    } catch {
      return '{}';
    }
  })();
  const query = (() => {
    try {
      const j = JSON.parse(raw);
      return j.query ?? '';
    } catch {
      return raw;
    }
  })();
  const transformed = useMemo(() => {
    const s = entry.transformedBody ?? entry.body ?? '';
    if (!s) return '';
    try {
      return JSON.stringify(JSON.parse(s), null, 2);
    } catch {
      return s;
    }
  }, [entry.transformedBody, entry.body]);
  const original = useMemo(() => {
    const s = entry.originalBody ?? '';
    if (!s) return '';
    try {
      return JSON.stringify(JSON.parse(s), null, 2);
    } catch {
      return s;
    }
  }, [entry.originalBody]);

  const operationName = (() => {
    try {
      const j = JSON.parse(raw);
      return j.operationName ?? '';
    } catch {
      return '';
    }
  })();

  const handleCreateRule = () => {
    if (onCreateRule) {
      onCreateRule({
        operationName,
        endpoint: entry.har.request.url,
        response: transformed,
        variables: vars !== '{}' ? vars : undefined,
      });
    }
  };

  return (
    <div className="h-full grid grid-rows-[auto_1fr]">
      <div className="border-b border-border px-2 py-1 flex items-center justify-between gap-2 bg-accent/10">
        <div className="flex items-center gap-2 min-w-0">
          <StatusBadge status={entry.isMocked ? 'mocked' : 'real'} />
          <OperationBadge name={operationName} />
          <span className="text-sm truncate" title={entry.har.request.url}>
            {entry.har.request.url}
          </span>
        </div>
        <Button
          onClick={handleCreateRule}
          size="sm"
          variant="outline"
          aria-label="Create mock rule from this request"
        >
          Create Rule From
        </Button>
      </div>
      <div className="p-2 overflow-auto h-full">
        <Tabs defaultValue="response" className="h-full flex flex-col">
          <TabsList className="mb-2">
            <TabsTrigger value="response">Response</TabsTrigger>
            {original && transformed && original !== transformed && (
              <TabsTrigger value="diff">Diff</TabsTrigger>
            )}
            {original && <TabsTrigger value="original">Original</TabsTrigger>}
          </TabsList>
          <TabsContent value="response" className="flex-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs mb-1 opacity-70">Request</div>
                <CodeView code={query} language="graphql" height={260} />
                <div className="text-xs mt-2 mb-1 opacity-70">Variables</div>
                <CodeView code={vars} language="json" height={200} />
              </div>
              <div>
                <div className="text-xs mb-1 opacity-70">
                  Transformed Response
                </div>
                <CodeView
                  code={transformed}
                  language={isJson(transformed) ? 'json' : 'text'}
                  height={480}
                />
              </div>
            </div>
          </TabsContent>
          {original && transformed && original !== transformed && (
            <TabsContent value="diff" className="flex-1">
              <DiffView original={original} transformed={transformed} />
            </TabsContent>
          )}
          {original && (
            <TabsContent value="original" className="flex-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs mb-1 opacity-70">
                    Original Response
                  </div>
                  <CodeView
                    code={original}
                    language={isJson(original) ? 'json' : 'text'}
                    height={480}
                  />
                </div>
                <div>
                  <div className="text-xs mb-1 opacity-70">
                    Transformed Response
                  </div>
                  <CodeView
                    code={transformed}
                    language={isJson(transformed) ? 'json' : 'text'}
                    height={480}
                  />
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default React.memo(RequestPanel, (prev, next) => {
  return prev.entry === next.entry && prev.onCreateRule === next.onCreateRule;
});

function isJson(s: string) {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

function DiffView({
  original,
  transformed,
}: {
  original: string;
  transformed: string;
}) {
  const oLines = original.split(/\r?\n/);
  const tLines = transformed.split(/\r?\n/);
  const max = Math.max(oLines.length, tLines.length);
  const rows = [] as Array<{ o?: string; t?: string; changed: boolean }>;
  for (let i = 0; i < max; i++) {
    const o = oLines[i];
    const t = tLines[i];
    rows.push({ o, t, changed: o !== t });
  }
  const changedCount = rows.filter((r) => r.changed).length;
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="text-xs opacity-70">
        {changedCount} line{changedCount === 1 ? '' : 's'} changed
      </div>
      <div className="grid grid-cols-2 gap-2 overflow-auto">
        <div className="border border-border rounded">
          <div className="text-xs px-2 py-1 border-b border-border bg-muted/40">
            Original
          </div>
          <pre className="text-xs p-2 overflow-auto leading-4">
            {rows.map((r, i) => (
              <div key={i} className={r.changed ? 'bg-red-500/10' : ''}>
                {r.o ?? ''}
              </div>
            ))}
          </pre>
        </div>
        <div className="border border-border rounded">
          <div className="text-xs px-2 py-1 border-b border-border bg-muted/40">
            Transformed
          </div>
          <pre className="text-xs p-2 overflow-auto leading-4">
            {rows.map((r, i) => (
              <div key={i} className={r.changed ? 'bg-green-500/10' : ''}>
                {r.t ?? ''}
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}
