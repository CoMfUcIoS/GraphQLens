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
import { Switch } from './ui/switch';

export default function MockToggle() {
  const [enabled, setEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // Load initial value
  React.useEffect(() => {
    chrome.storage.local.get(['gql_enabled'], (v) => {
      setEnabled(Boolean(v?.gql_enabled));
      setLoading(false);
    });

    // Stay in sync if another panel/window flips the switch
    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area !== 'local') return;
      if (Object.prototype.hasOwnProperty.call(changes, 'gql_enabled')) {
        setEnabled(Boolean(changes.gql_enabled.newValue));
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const onToggle = (value: boolean) => {
    setEnabled(value);
    chrome.storage.local.set({ gql_enabled: value });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs opacity-70">Mocking</span>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={loading}
        aria-label="Enable GraphQL mocking"
      />
    </div>
  );
}
