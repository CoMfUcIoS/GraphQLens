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
import { useMemo, useState, memo } from 'react';
import { useDebounce } from '../../lib/useDebounce';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  RowSelectionState,
} from '@tanstack/react-table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

type Rule = {
  id: string;
  operationName: string;
  endpoint: string;
  statusCode: number;
  response: unknown;
  variables?: Record<string, unknown>;
};

type RulePanelProps = {
  rules: Rule[];
  onEdit?: (_rule: Rule) => void;
  onDuplicate?: (_rule: Rule) => void;
  onDelete?: (_id: string) => void;
  onBulkDelete?: (_ids: string[]) => void;
  isDeleting?: boolean;
};

function RulePanel({
  rules,
  isDeleting = false,
  onEdit,
  onDuplicate,
  onDelete,
  onBulkDelete,
}: RulePanelProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [filterInput, setFilterInput] = useState('');
  const debouncedFilter = useDebounce(filterInput);
  const [detailRule, setDetailRule] = useState<Rule | null>(null);

  const columns = useMemo<ColumnDef<Rule>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomeRowsSelected();
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="cursor-pointer"
          />
        ),
        size: 40,
      },
      {
        accessorKey: 'operationName',
        header: 'Operation',
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'endpoint',
        header: 'Endpoint',
        cell: (info) => (
          <div
            className="truncate max-w-[300px]"
            title={info.getValue() as string}
          >
            {info.getValue() as string}
          </div>
        ),
      },
      {
        accessorKey: 'variables',
        header: 'Variables',
        cell: ({ row }) => {
          const vars = row.original.variables;
          if (!vars || Object.keys(vars).length === 0) {
            return (
              <div className="text-muted-foreground text-xs italic">Any</div>
            );
          }
          const varStr = JSON.stringify(vars);
          return (
            <div className="truncate max-w-[150px] text-xs" title={varStr}>
              {varStr}
            </div>
          );
        },
        size: 150,
      },
      {
        accessorKey: 'statusCode',
        header: 'Status',
        cell: (info) => (
          <div className="text-center">{info.getValue() as number}</div>
        ),
        size: 80,
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex gap-1 justify-end">
            {onDuplicate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDuplicate(row.original)}
                disabled={isDeleting}
                aria-label="Duplicate rule"
              >
                Duplicate
              </Button>
            )}
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(row.original)}
                disabled={isDeleting}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(row.original.id)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
        ),
        size: 200,
      },
    ],
    [onEdit, onDuplicate, onDelete, isDeleting],
  );

  const table = useReactTable({
    data: rules,
    columns,
    state: { rowSelection, globalFilter: debouncedFilter },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: () => {},
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  const handleBulkDelete = () => {
    if (onBulkDelete && hasSelection) {
      const ids = selectedRows.map((row) => row.original.id);
      if (confirm(`Are you sure you want to delete ${ids.length} rule(s)?`)) {
        onBulkDelete(ids);
        setRowSelection({});
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 space-y-2 border-b border-border">
        <Input
          placeholder="Search rules..."
          value={filterInput}
          onChange={(e) => setFilterInput(e.target.value)}
          className="h-8"
        />
        {hasSelection && (
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-70">
              {selectedRows.length} rule(s) selected
            </span>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Selected'}
            </Button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {rules.length > 0 && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b border-border">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="text-left py-2 px-2 font-medium"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-muted/50 cursor-pointer"
                  onClick={(e) => {
                    // Don't open modal if clicking on checkbox, edit, or delete buttons
                    const target = e.target as HTMLElement;
                    if (
                      (target as HTMLInputElement).type === 'checkbox' ||
                      target.closest('button') ||
                      target.tagName === 'INPUT'
                    ) {
                      return;
                    }
                    setDetailRule(row.original);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-2 px-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {table.getFilteredRowModel().rows.length === 0 && rules.length > 0 && (
        <div className="p-4 text-center opacity-60">
          No rules match your search.
        </div>
      )}
      <RuleDetailModal
        rule={detailRule}
        open={!!detailRule}
        onClose={() => setDetailRule(null)}
        isDeleting={isDeleting}
        onEdit={() => {
          if (detailRule && onEdit) {
            onEdit(detailRule);
            setDetailRule(null);
          }
        }}
        onDelete={() => {
          if (detailRule && onDelete) {
            onDelete(detailRule.id);
            setDetailRule(null);
          }
        }}
      />
    </div>
  );
}

export default memo(RulePanel, (prev, next) => {
  return (
    prev.rules === next.rules &&
    prev.onEdit === next.onEdit &&
    prev.onDelete === next.onDelete &&
    prev.onBulkDelete === next.onBulkDelete &&
    prev.isDeleting === next.isDeleting
  );
});

type RuleDetailModalProps = {
  rule: Rule | null;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
};

function RuleDetailModal({
  rule,
  open,
  onClose,
  onEdit,
  onDelete,
  isDeleting = false,
}: RuleDetailModalProps) {
  if (!rule) return null;

  const responseText = (() => {
    try {
      return JSON.stringify(rule.response, null, 2);
    } catch {
      return String(rule.response ?? '');
    }
  })();

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        open ? 'visible' : 'hidden'
      }`}
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative bg-background border border-border rounded-lg shadow-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Rule Details</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <label className="text-xs font-medium opacity-70">
              Operation Name
            </label>
            <div className="mt-1 text-sm">{rule.operationName}</div>
          </div>
          <div>
            <label className="text-xs font-medium opacity-70">Endpoint</label>
            <div className="mt-1 text-sm break-all">{rule.endpoint}</div>
          </div>
          <div>
            <label className="text-xs font-medium opacity-70">
              Status Code
            </label>
            <div className="mt-1 text-sm">{rule.statusCode}</div>
          </div>
          {rule.variables && Object.keys(rule.variables).length > 0 && (
            <div>
              <label className="text-xs font-medium opacity-70">
                Variables (Match Criteria)
              </label>
              <pre className="mt-1 text-xs bg-muted p-3 rounded overflow-auto max-h-32">
                {JSON.stringify(rule.variables, null, 2)}
              </pre>
            </div>
          )}
          <div>
            <label className="text-xs font-medium opacity-70">Response</label>
            <pre className="mt-1 text-xs bg-muted p-3 rounded overflow-auto max-h-64">
              {responseText}
            </pre>
          </div>
        </div>
        <div className="border-t border-border px-4 py-3 flex gap-2 justify-end">
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
          {onEdit && (
            <Button size="sm" onClick={onEdit} disabled={isDeleting}>
              Edit
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
