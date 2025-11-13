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
import { useEffect, useState, useCallback } from 'react';
import RulePanel from './RulePanel';
import RuleModal from './RuleModal';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/EmptyState';
import { ListSkeleton } from '../../components/Skeleton';
import { Alert } from '../../components/Alert';
import {
  useStatusStore,
  useRulesStatus,
  useStatusError,
} from '../../state/statusStore';
import { ErrorBoundary } from '../../components/ErrorBoundary';

type Rule = {
  id: string;
  operationName: string;
  endpoint: string;
  statusCode: number;
  response: unknown;
  variables?: Record<string, unknown>;
};

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [open, setOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [duplicateInitialData, setDuplicateInitialData] = useState<{
    operationName: string;
    endpoint: string;
    response: string;
    variables?: string;
  } | null>(null);
  const [importAlert, setImportAlert] = useState<{
    variant: 'error' | 'success';
    message: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const rulesStatus = useRulesStatus();
  const setStatus = useStatusStore((s) => s.setStatus);
  const setError = useStatusStore((s) => s.setError);
  const clearError = useStatusStore((s) => s.clearError);
  const error = useStatusError('rules');

  const loadRules = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'GQLENS_GET_RULES' }, (v) => {
      if (chrome.runtime.lastError) {
        setError('rules', 'Failed to load rules.');
      } else {
        clearError('rules');
        setRules(v?.gql_rules ?? []);
      }
    });
  }, [setError, clearError]);

  useEffect(() => {
    loadRules();
    // Poll for updates every 2 seconds to catch rules created from other tabs
    const interval = setInterval(loadRules, 2000);
    return () => clearInterval(interval);
  }, [loadRules]);

  useEffect(() => {
    if (rules.length > 0) {
      setStatus('rules', 'ready');
      return;
    }
    const t = setTimeout(() => {
      if (rules.length === 0) setStatus('rules', 'empty');
    }, 800);
    return () => clearTimeout(t);
  }, [rules, setStatus]);

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule);
    setOpen(true);
  };

  const handleDuplicate = (rule: Rule) => {
    // Prepare initial data for duplication (exclude id)
    let responseStr: string;
    try {
      responseStr = JSON.stringify(rule.response, null, 2);
    } catch {
      responseStr = String(rule.response ?? '{}');
    }
    let varsStr: string | undefined;
    if (rule.variables && Object.keys(rule.variables).length > 0) {
      try {
        varsStr = JSON.stringify(rule.variables, null, 2);
      } catch {
        varsStr = undefined;
      }
    }
    setDuplicateInitialData({
      operationName: rule.operationName,
      endpoint: rule.endpoint,
      response: responseStr,
      ...(varsStr ? { variables: varsStr } : {}),
    });
    setEditingRule(null); // ensure modal isn't in edit mode
    setOpen(true);
  };

  const handleDelete = (deleteId: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      setIsDeleting(true);
      chrome.runtime.sendMessage({ type: 'GQLENS_GET_RULES' }, (v) => {
        const prev: Rule[] = Array.isArray(v?.gql_rules) ? v.gql_rules : [];
        const next = prev.filter((r) => r.id !== deleteId);
        chrome.runtime.sendMessage({ type: 'GQLENS_SET_RULES', rules: next });
        setRules(next);
        setIsDeleting(false);
      });
    }
  };

  const handleBulkDelete = (ids: string[]) => {
    setIsDeleting(true);
    chrome.runtime.sendMessage({ type: 'GQLENS_GET_RULES' }, (v) => {
      const prev: Rule[] = Array.isArray(v?.gql_rules) ? v.gql_rules : [];
      const next = prev.filter((r) => !ids.includes(r.id));
      chrome.runtime.sendMessage({ type: 'GQLENS_SET_RULES', rules: next });
      setRules(next);
      setIsDeleting(false);
    });
  };

  const handleCloseModal = (isOpen: boolean) => {
    setOpen(isOpen);
    // Always reset editingRule when closing the modal, regardless of how it is closed
    if (!isOpen) {
      setEditingRule(null);
      setDuplicateInitialData(null);
    }
  };

  const handleExport = () => {
    // Export rules without IDs for portability
    const exportData = rules.map((rule) =>
      Object.fromEntries(Object.entries(rule).filter(([key]) => key !== 'id')),
    );
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graphqlens-rules-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedRules = JSON.parse(event.target?.result as string);
          if (!Array.isArray(importedRules)) {
            setImportAlert({
              variant: 'error',
              message: 'Invalid rules file format',
            });
            return;
          }

          // Validate and sanitize imported rules
          const sanitizedRules = importedRules
            .filter((rule) => {
              // Validate required fields
              return (
                rule &&
                typeof rule === 'object' &&
                rule.endpoint &&
                typeof rule.endpoint === 'string' &&
                rule.endpoint.trim() !== ''
              );
            })
            .map((rule) => ({
              // Always generate new IDs for imported rules
              id: crypto.randomUUID(),
              operationName: String(rule.operationName || ''),
              endpoint: String(rule.endpoint).trim(),
              statusCode:
                typeof rule.statusCode === 'number' &&
                rule.statusCode >= 100 &&
                rule.statusCode < 600
                  ? rule.statusCode
                  : 200,
              response: rule.response !== undefined ? rule.response : {},
              ...(rule.variables &&
              typeof rule.variables === 'object' &&
              Object.keys(rule.variables).length > 0
                ? { variables: rule.variables }
                : {}),
            }));

          if (sanitizedRules.length === 0) {
            setImportAlert({
              variant: 'error',
              message: 'No valid rules found in the file',
            });
            return;
          }

          chrome.runtime.sendMessage({ type: 'GQLENS_GET_RULES' }, (v) => {
            const existing: Rule[] = Array.isArray(v?.gql_rules)
              ? v.gql_rules
              : [];
            const merged = [...existing, ...sanitizedRules];
            chrome.runtime.sendMessage({
              type: 'GQLENS_SET_RULES',
              rules: merged,
            });
            setRules(merged);
            setImportAlert({
              variant: 'success',
              message: `Successfully imported ${sanitizedRules.length} rule(s)`,
            });
          });
        } catch (err) {
          console.error('Import error:', err);
          setImportAlert({
            variant: 'error',
            message: 'Failed to import rules. Please check the file format.',
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="h-full grid grid-rows-[auto_1fr]">
      <div className="border-b border-border px-2 py-1 flex flex-col gap-2">
        <Button onClick={() => setOpen(true)} size="sm">
          New rule
        </Button>
        <Button
          onClick={handleExport}
          size="sm"
          variant="outline"
          disabled={rules.length === 0}
        >
          Export
        </Button>
        <Button onClick={handleImport} size="sm" variant="outline">
          Import
        </Button>
        {importAlert && (
          <Alert
            variant={importAlert.variant}
            description={importAlert.message}
            onClose={() => setImportAlert(null)}
          />
        )}
        {error && (
          <Alert
            variant="error"
            title="Load issue"
            description={error}
            action={
              <button
                className="text-xs underline"
                onClick={() => {
                  clearError('rules');
                  setStatus('rules', 'loading');
                  loadRules();
                }}
              >
                Retry
              </button>
            }
            onClose={() => clearError('rules')}
          />
        )}
      </div>
      {rulesStatus === 'loading' ? (
        <div className="flex-1 overflow-auto">
          <ListSkeleton rows={6} />
        </div>
      ) : rulesStatus === 'empty' ? (
        <EmptyState
          title="No rules defined"
          description={
            'Create a rule to mock GraphQL responses.\nRules can match on endpoint, operation name and variables.'
          }
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              Create first rule
            </Button>
          }
          className="flex-1"
        />
      ) : (
        <ErrorBoundary label="Rule Panel">
          <RulePanel
            rules={rules}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            isDeleting={isDeleting}
          />
        </ErrorBoundary>
      )}
      <RuleModal
        open={open}
        setOpen={handleCloseModal}
        onCreate={(r) => {
          setRules((p) => [...p, r]);
          setDuplicateInitialData(null);
        }}
        editRule={editingRule}
        onUpdate={(r) =>
          setRules((p) => p.map((rule) => (rule.id === r.id ? r : rule)))
        }
        initialData={duplicateInitialData}
      />
    </div>
  );
}
