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
import { create } from 'zustand';

export type ResourceStatus = 'idle' | 'loading' | 'error' | 'ready' | 'empty';

type StatusKey = 'requests' | 'rules';

interface StatusState {
  requests: ResourceStatus;
  rules: ResourceStatus;
  errors: Partial<Record<StatusKey, string>>;
  setStatus: (key: StatusKey, status: ResourceStatus) => void;
  setError: (key: StatusKey, message: string) => void;
  clearError: (key: StatusKey) => void;
  reset: () => void;
}

export const useStatusStore = create<StatusState>((set) => ({
  requests: 'loading',
  rules: 'loading',
  errors: {},
  setStatus: (_key, _status) =>
    set(() => ({ [_key]: _status }) as Partial<StatusState>),
  setError: (_key, _message) =>
    set((s) => ({ errors: { ...s.errors, [_key]: _message } })),
  clearError: (_key) =>
    set((s) => {
      const next = { ...s.errors };
      delete next[_key];
      return { errors: next };
    }),
  reset: () => set({ requests: 'idle', rules: 'idle', errors: {} }),
}));

// Convenience hooks for selective subscriptions
export function useRequestsStatus() {
  return useStatusStore((s) => s.requests);
}

export function useRulesStatus() {
  return useStatusStore((s) => s.rules);
}

export function useStatusError(key: StatusKey) {
  return useStatusStore((s) => s.errors[key]);
}
