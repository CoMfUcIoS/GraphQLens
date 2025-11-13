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
import { Badge } from './ui/badge';

export function StatusBadge({ status }: { status: 'mocked' | 'real' }) {
  return (
    <Badge
      variant={status === 'mocked' ? 'default' : 'secondary'}
      aria-label={status === 'mocked' ? 'Mocked response' : 'Real response'}
    >
      {status === 'mocked' ? 'Mocked' : 'Real'}
    </Badge>
  );
}

export function OperationBadge({ name }: { name: string }) {
  return (
    <Badge variant="outline" aria-label={`Operation ${name || 'unknown'}`}>
      {name || 'Unknown'}
    </Badge>
  );
}
