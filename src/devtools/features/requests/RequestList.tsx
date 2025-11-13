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
import { useVirtualizer } from '@tanstack/react-virtual';
import { Badge } from '../../components/ui/badge';
import type { Entry } from '@/types/shared';
import { useSettingsStore } from '../../state/settingsStore';

type Props = {
  entries: Entry[];
  selectedId: string | null;
  onSelect: (_id: string) => void;
};

type GroupedEntries = {
  label: string;
  entries: Entry[];
};

// Heuristic row height (adjusted by density); virtualizer will measure on mount for accuracy.
const COMFORTABLE_ROW = 44;
const COMPACT_ROW = 32;

export default function RequestList({ entries, selectedId, onSelect }: Props) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const density = useSettingsStore((s) => s.density);
  const rowSize = density === 'compact' ? COMPACT_ROW : COMFORTABLE_ROW;

  // Group entries by mocked status
  const groups: GroupedEntries[] = React.useMemo(() => {
    const mocked = entries.filter((e) => e.isMocked);
    const notMocked = entries.filter((e) => !e.isMocked);

    const result: GroupedEntries[] = [];

    if (mocked.length > 0) {
      result.push({ label: `Mocked (${mocked.length})`, entries: mocked });
    }
    if (notMocked.length > 0) {
      result.push({
        label: `Not Mocked (${notMocked.length})`,
        entries: notMocked,
      });
    }

    return result;
  }, [entries]);

  // Flatten groups for virtualization, including group headers
  const flatItems = React.useMemo(() => {
    const items: Array<
      { type: 'header'; label: string } | { type: 'entry'; entry: Entry }
    > = [];
    groups.forEach((group) => {
      items.push({ type: 'header', label: group.label });
      group.entries.forEach((entry) => {
        items.push({ type: 'entry', entry });
      });
    });
    return items;
  }, [groups]);

  const rowVirtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = flatItems[index];
      return item.type === 'header'
        ? density === 'compact'
          ? 26
          : 32
        : rowSize;
    },
    overscan: 12,
    measureElement:
      typeof window !== 'undefined' && 'ResizeObserver' in window
        ? (el) => el.getBoundingClientRect().height
        : undefined,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((vi) => {
          const item = flatItems[vi.index];

          if (item.type === 'header') {
            return (
              <div
                key={`header-${vi.index}`}
                data-index={vi.index}
                ref={rowVirtualizer.measureElement}
                className="absolute left-0 right-0 px-3 py-1.5 bg-muted/50 border-b border-border"
                style={{
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                <div className="text-xs font-semibold opacity-70">
                  {item.label}
                </div>
              </div>
            );
          }

          const e = item.entry;
          const active = selectedId === e?.id;
          return (
            <div
              key={e.id}
              data-index={vi.index}
              ref={rowVirtualizer.measureElement}
              className={`absolute left-0 right-0 border-b border-border cursor-pointer transition-colors hover:bg-white/5 ${
                active
                  ? 'bg-accent/30 border-l-4 border-primary shadow-sm'
                  : 'border-l-4 border-transparent'
              } ${density === 'compact' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}`}
              style={{
                transform: `translateY(${vi.start}px)`,
              }}
              onClick={() => onSelect(e.id)}
              title={e.har?.request?.url || ''}
              aria-current={active ? 'true' : undefined}
            >
              <div
                className={`flex items-center min-w-0 ${density === 'compact' ? 'gap-1.5' : 'gap-2'}`}
              >
                <Badge variant={e.isMocked ? 'default' : 'secondary'}>
                  {extractOp(e.har?.request?.postData?.text)}
                </Badge>
                <div
                  className={`truncate ${density === 'compact' ? '' : 'text-sm'}`}
                >
                  {e.har?.request?.url}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function extractOp(text?: string) {
  if (!text) return 'GQL';
  try {
    const j = JSON.parse(text);
    if (Array.isArray(j)) {
      const names = j.map((x) => x?.operationName).filter(Boolean);
      return names.length ? names.join(',') : 'GQL';
    }
    return (
      j?.operationName || (j?.extensions?.persistedQuery ? 'persisted' : 'GQL')
    );
  } catch {
    return 'GQL';
  }
}
