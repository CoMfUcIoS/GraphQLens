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
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import MockToggle from './components/MockToggle';
import RequestsPage from './features/requests/RequestsPage';
import RulesPage from './features/rules/RulesPage';
import { CommandPalette } from './components/CommandPalette';
import {
  OnboardingOverlay,
  checkOnboardingNeeded,
} from './components/OnboardingOverlay';
import { ThemeDensityToggle } from './components/ThemeDensityToggle';
import { useSettingsStore } from './state/settingsStore';

export default function App() {
  const [tab, setTab] = useState('requests');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const togglePalette = useCallback(() => setPaletteOpen((o) => !o), []);
  const resolvedDark = useSettingsStore((s) => s.resolvedDark);
  const density = useSettingsStore((s) => s.density);

  // Apply dark class to document root so CSS variables work everywhere
  useEffect(() => {
    if (resolvedDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [resolvedDark]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const metaK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (metaK) {
        e.preventDefault();
        togglePalette();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePalette]);
  // Onboarding check
  useEffect(() => {
    let mounted = true;
    checkOnboardingNeeded().then((needed) => {
      if (mounted && needed) setShowOnboarding(true);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <div className="h-full flex flex-col" data-density={density}>
      <div className="border-b border-border px-2">
        <div className="flex items-center justify-between">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList>
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="pl-2 flex items-center gap-2">
            <MockToggle />
            <ThemeDensityToggle />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className={tab === 'requests' ? 'h-full' : 'hidden'}>
          <RequestsPage />
        </div>
        <div className={tab === 'rules' ? 'h-full' : 'hidden'}>
          <RulesPage />
        </div>
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
      <OnboardingOverlay
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  );
}
