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
import * as React from 'react';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/Alert';

type Rule = {
  id: string;
  operationName: string;
  endpoint: string;
  statusCode: number;
  response: unknown;
  variables?: Record<string, unknown>;
};

type RuleModalProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onCreate: (_rule: Rule) => void;
  initialData?: {
    operationName: string;
    endpoint: string;
    response: string;
    variables?: string;
  } | null;
  editRule?: Rule | null;
  onUpdate?: (_rule: Rule) => void;
};

export default function RuleModal({
  setOpen,
  onCreate,
  initialData,
  editRule,
  open,
  onUpdate,
}: RuleModalProps) {
  const isEditing = !!editRule;
  const [op, setOp] = React.useState(
    editRule?.operationName ?? initialData?.operationName ?? '',
  );
  const [endpoint, setEndpoint] = React.useState(
    editRule?.endpoint ?? initialData?.endpoint ?? '',
  );
  const [statusCode, setStatusCode] = React.useState(
    editRule?.statusCode ?? 200,
  );
  const [varsText, setVarsText] = React.useState(
    editRule?.variables
      ? JSON.stringify(editRule.variables, null, 2)
      : (initialData?.variables ?? ''),
  );
  const [respText, setRespText] = React.useState(
    editRule?.response
      ? JSON.stringify(editRule.response, null, 2)
      : (initialData?.response ?? ''),
  );
  const [varsValid, setVarsValid] = React.useState(true);
  const [respValid, setRespValid] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Reset form when modal opens or editRule changes
  React.useEffect(() => {
    if (open) {
      setOp(editRule?.operationName ?? initialData?.operationName ?? '');
      setEndpoint(editRule?.endpoint ?? initialData?.endpoint ?? '');
      setStatusCode(editRule?.statusCode ?? 200);
      setVarsText(
        editRule?.variables
          ? JSON.stringify(editRule.variables, null, 2)
          : (initialData?.variables ?? ''),
      );
      setRespText(
        editRule?.response
          ? JSON.stringify(editRule.response, null, 2)
          : (initialData?.response ?? ''),
      );
      setErrorMessage(null);
    }
  }, [editRule, initialData, open]);

  React.useEffect(() => {
    if (!varsText.trim()) {
      setVarsValid(true);
      return;
    }
    try {
      JSON.parse(varsText);
      setVarsValid(true);
    } catch {
      setVarsValid(false);
    }
  }, [varsText]);
  React.useEffect(() => {
    if (!respText.trim()) {
      setRespValid(true);
      return;
    }
    try {
      JSON.parse(respText);
      setRespValid(true);
    } catch {
      setRespValid(false);
    }
  }, [respText]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const responseText = respText || '{}';
      const variablesText = varsText || '';
      let response: unknown = {};
      let variables: Record<string, unknown> | undefined = undefined;

      try {
        response = responseText ? JSON.parse(responseText) : {};
      } catch {
        setErrorMessage('Response must be valid JSON');
        return;
      }

      if (variablesText.trim()) {
        try {
          variables = JSON.parse(variablesText);
        } catch {
          setErrorMessage('Variables must be valid JSON');
          return;
        }
      }

      const rule: Rule = {
        id: isEditing ? editRule.id : crypto.randomUUID(),
        operationName: op,
        endpoint,
        statusCode,
        response,
        ...(variables && Object.keys(variables).length > 0
          ? { variables }
          : {}),
      };
      // fetch existing, update or append, persist
      chrome.runtime.sendMessage({ type: 'GQLENS_GET_RULES' }, (v: unknown) => {
        const prev: Rule[] = Array.isArray(
          (v as { gql_rules?: unknown })?.gql_rules,
        )
          ? ((v as { gql_rules?: Rule[] }).gql_rules ?? [])
          : [];

        // Check for duplicate rule (operation + endpoint + variables must be unique)
        const isDuplicate = prev.some((r) => {
          // Skip checking against itself when editing
          if (isEditing && r.id === rule.id) return false;

          // Check if operation name and endpoint match
          if (
            r.operationName !== rule.operationName ||
            r.endpoint !== rule.endpoint
          ) {
            return false;
          }

          // Check if variables match (deep equality)
          const rVars = r.variables || {};
          const ruleVars = rule.variables || {};
          return JSON.stringify(rVars) === JSON.stringify(ruleVars);
        });

        if (isDuplicate) {
          setErrorMessage(
            'A rule with the same operation name, endpoint, and variables already exists.',
          );
          return;
        }

        const next = isEditing
          ? prev.map((r) => (r.id === rule.id ? rule : r))
          : [...prev, rule];
        chrome.runtime.sendMessage({ type: 'GQLENS_SET_RULES', rules: next });
        if (isEditing && onUpdate) {
          onUpdate(rule);
        } else {
          onCreate(rule);
        }
        setOpen(false);
      });
    } catch (err) {
      console.error(err);
      setErrorMessage(`Failed to ${isEditing ? 'update' : 'create'} rule`);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => setOpen(false)}
    >
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative bg-background border border-border rounded-lg shadow-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Mock Rule' : 'Create Mock Rule'}
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <form
          onSubmit={submit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {errorMessage && (
              <Alert
                variant="error"
                description={errorMessage}
                onClose={() => setErrorMessage(null)}
              />
            )}
            <div>
              <label className="text-xs font-medium opacity-70">
                Operation Name *
              </label>
              <Input
                placeholder="e.g., GetUser"
                required
                value={op}
                onChange={(e) => setOp(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium opacity-70">
                Endpoint *
              </label>
              <Input
                placeholder="https://api.example.com/graphql"
                required
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium opacity-70">
                Status Code
              </label>
              <Input
                type="number"
                min={100}
                max={599}
                value={statusCode}
                onChange={(e) => setStatusCode(Number(e.target.value))}
                className="mt-1 w-32"
              />
            </div>
            <div>
              <label className="text-xs font-medium opacity-70 flex items-center justify-between">
                <span>Variables (Match Criteria)</span>
                <span
                  className={`text-xs ${varsValid ? 'text-green-500' : 'text-red-500'}`}
                >
                  {varsValid ? '✓ Valid JSON' : '✗ Invalid JSON'}
                </span>
              </label>
              <Textarea
                placeholder='{"id": "123"} (optional - leave empty to match any variables)'
                className="mt-1 text-xs font-mono"
                rows={6}
                value={varsText}
                onChange={(e) => setVarsText(e.target.value)}
                aria-invalid={!varsValid}
              />
            </div>
            <div>
              <label className="text-xs font-medium opacity-70 flex items-center justify-between">
                <span>Response *</span>
                <span
                  className={`text-xs ${respValid ? 'text-green-500' : 'text-red-500'}`}
                >
                  {respValid ? '✓ Valid JSON' : '✗ Invalid JSON'}
                </span>
              </label>
              <Textarea
                placeholder='{"data": {"user": {"id": "123", "name": "John Doe"}}}'
                className="mt-1 text-xs font-mono"
                rows={12}
                value={respText}
                onChange={(e) => setRespText(e.target.value)}
                aria-invalid={!respValid}
              />
            </div>
          </div>
          <div className="border-t border-border px-4 py-3 flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={
                !respValid || !varsValid || !op.trim() || !endpoint.trim()
              }
            >
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
