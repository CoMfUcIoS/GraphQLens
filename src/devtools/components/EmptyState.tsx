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

type EmptyStateProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  title = 'Nothing here yet',
  description,
  action,
  icon,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-3 py-10 px-4 ${className}`}
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-2 max-w-md">
        {icon && (
          <div className="text-muted-foreground" aria-hidden>
            {icon}
          </div>
        )}
        <h2 className="text-sm font-medium text-foreground/90">{title}</h2>
        {description && (
          <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
            {description}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
