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
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onSelectRequest?: (_direction: 'up' | 'down') => void;
  onTriggerCreateRule?: () => void;
};

export function CommandPalette({
  open,
  onClose,
  onTriggerCreateRule,
}: CommandPaletteProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={ref}
        className="relative w-[520px] bg-background border border-border rounded-lg shadow-lg overflow-hidden"
      >
        <div className="border-b border-border px-4 py-3 text-sm font-medium">
          Command Palette
        </div>
        <div className="p-4 space-y-2 text-xs">
          <div className="opacity-70">Shortcuts</div>
          <ul className="space-y-1">
            <li>
              <kbd className="px-1 py-0.5 bg-muted rounded">↑/↓</kbd> Navigate
              requests
            </li>
            <li>
              <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> Create
              rule (when a request is selected)
            </li>
            <li>
              <kbd className="px-1 py-0.5 bg-muted rounded">Cmd+K</kbd> Open
              this palette
            </li>
            <li>
              <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> Close
              palette
            </li>
          </ul>
          <div className="pt-2">
            <button
              className="text-xs underline"
              onClick={() => {
                onTriggerCreateRule?.();
                onClose();
              }}
            >
              Create rule from selected request
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
