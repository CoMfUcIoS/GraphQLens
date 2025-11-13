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

type SkeletonProps = {
  className?: string;
  lines?: number;
  animated?: boolean;
};

export function Skeleton({
  className = '',
  lines = 1,
  animated = true,
}: SkeletonProps) {
  if (lines <= 1) {
    return (
      <div
        className={`rounded bg-muted motion-safe:${animated ? 'animate-pulse' : ''} ${className}`}
        aria-busy={animated}
        aria-live="polite"
        role="status"
        aria-label="Loading"
      />
    );
  }
  return (
    <div
      className={`space-y-2 ${className}`}
      aria-busy={animated}
      aria-live="polite"
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3 w-full rounded bg-muted motion-safe:${animated ? 'animate-pulse' : ''}`}
        />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      className="divide-y divide-border"
      aria-busy
      aria-live="polite"
      role="status"
      aria-label="Loading list"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-3 py-2 flex items-center gap-2">
          <div className="h-5 w-16 rounded bg-muted motion-safe:animate-pulse" />
          <div className="h-4 flex-1 rounded bg-muted motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  );
}
