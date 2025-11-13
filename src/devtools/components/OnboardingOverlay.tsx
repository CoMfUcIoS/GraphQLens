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
import { Button } from './ui/button';

interface OnboardingOverlayProps {
  open: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'gql_onboarding_done';

export function OnboardingOverlay({ open, onClose }: OnboardingOverlayProps) {
  const firstRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open && firstRef.current) {
      firstRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="GraphQLens quick tour"
    >
      <div className="w-[600px] max-w-[90vw] bg-background border border-border rounded shadow-lg p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Welcome to GraphQLens</h2>
        <ol className="list-decimal list-inside space-y-3 text-sm">
          <li>
            <strong>Live Capture:</strong> The left panel records GraphQL
            requests (including mocked ones) as you browse.
          </li>
          <li>
            <strong>Inspect & Diff:</strong> Select a request to view query,
            variables and compare original vs transformed responses.
          </li>
          <li>
            <strong>Create Rules Fast:</strong> Use the <em>Create Rule</em>{' '}
            button or press <code>Enter</code> on a selected request to mock
            future calls.
          </li>
          <li>
            <strong>Keyboard & Palette:</strong> Press <code>Cmd/Ctrl + K</code>{' '}
            to open the shortcut palette.
          </li>
          <li>
            <strong>Toggle Mocking:</strong> Use the <em>Mocking</em> switch in
            the header to enable or disable rule interception.
          </li>
        </ol>
        <p className="text-xs opacity-70">
          You can revisit these concepts later in the Help section (coming
          soon). All data stays within your browser.
        </p>
        <div className="flex justify-end gap-2 mt-2">
          <Button
            ref={firstRef}
            variant="outline"
            size="sm"
            onClick={() => {
              // Do not persist completion
              onClose();
            }}
          >
            Skip for now
          </Button>
          <Button
            size="sm"
            onClick={() => {
              try {
                chrome.storage.local.set({ [STORAGE_KEY]: true });
              } catch {
                // intentionally empty: ignore storage errors
                try {
                  localStorage.setItem(STORAGE_KEY, 'true');
                } catch {
                  /* intentionally empty: ignore storage errors */
                }
              }
              onClose();
            }}
            aria-label="Finish onboarding"
          >
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}

export async function checkOnboardingNeeded(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get([STORAGE_KEY], (v) => {
        if (chrome.runtime.lastError) {
          // Fallback to localStorage
          try {
            const ls = localStorage.getItem(STORAGE_KEY);
            resolve(ls !== 'true');
          } catch {
            resolve(true);
          }
        } else {
          resolve(!v?.[STORAGE_KEY]);
        }
      });
    } catch {
      try {
        const ls = localStorage.getItem(STORAGE_KEY);
        resolve(ls !== 'true');
      } catch {
        resolve(true);
      }
    }
  });
}
