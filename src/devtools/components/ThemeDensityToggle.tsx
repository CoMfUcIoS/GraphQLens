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
import React from 'react';
import { useSettingsStore } from '../state/settingsStore';
import { Button } from './ui/button';

export function ThemeDensityToggle() {
  const theme = useSettingsStore((s) => s.theme);
  const density = useSettingsStore((s) => s.density);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setDensity = useSettingsStore((s) => s.setDensity);

  const cycleTheme = () => {
    setTheme(
      theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system',
    );
  };
  const toggleDensity = () => {
    setDensity(density === 'comfortable' ? 'compact' : 'comfortable');
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={cycleTheme}
        aria-label="Cycle theme mode"
      >
        Theme: {theme}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleDensity}
        aria-label="Toggle density"
      >
        {density === 'compact' ? 'Compact ✓' : 'Compact'}
      </Button>
    </div>
  );
}
