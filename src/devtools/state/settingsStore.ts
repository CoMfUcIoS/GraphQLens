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

type ThemeMode = 'system' | 'light' | 'dark';
type Density = 'comfortable' | 'compact';

interface SettingsState {
  theme: ThemeMode;
  density: Density;
  setTheme: (_t: ThemeMode) => void;
  setDensity: (_d: Density) => void;
  resolvedDark: boolean; // computed based on system + theme
}

const THEME_KEY = 'gql_theme';
const DENSITY_KEY = 'gql_density';

function getStored<T extends string>(key: string, fallback: T): T {
  try {
    // chrome storage async; fallback to localStorage for speed
    const ls = localStorage.getItem(key);
    return (ls as T) || fallback;
  } catch {
    return fallback;
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initialTheme = getStored<ThemeMode>(THEME_KEY, 'system');
  const initialDensity = getStored<Density>(DENSITY_KEY, 'comfortable');

  const computeDark = (theme: ThemeMode) => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  };

  // Listen for system changes when on system mode
  if (typeof window !== 'undefined') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
      const { theme } = get();
      if (theme === 'system') {
        set({ resolvedDark: computeDark(theme) });
      }
    });
  }

  return {
    theme: initialTheme,
    density: initialDensity,
    resolvedDark: computeDark(initialTheme),
    setTheme: (_t) => {
      try {
        localStorage.setItem(THEME_KEY, _t);
      } catch {
        /* ignore */
      }
      set({ theme: _t, resolvedDark: computeDark(_t) });
    },
    setDensity: (_d) => {
      try {
        localStorage.setItem(DENSITY_KEY, _d);
      } catch {
        /* ignore */
      }
      set({ density: _d });
    },
  };
});
