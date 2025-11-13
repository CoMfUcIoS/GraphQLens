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
import { Button } from './ui/button';

type AlertProps = {
  variant?: 'error' | 'info' | 'warning' | 'success';
  title?: string;
  description?: string;
  action?: React.ReactNode;
  onClose?: () => void;
  className?: string;
};

const variantStyles: Record<string, string> = {
  error: 'bg-red-500/10 border border-red-500/40 text-red-400',
  info: 'bg-blue-500/10 border border-blue-500/40 text-blue-400',
  warning: 'bg-amber-500/10 border border-amber-500/40 text-amber-400',
  success: 'bg-green-500/10 border border-green-500/40 text-green-400',
};

export function Alert({
  variant = 'info',
  title,
  description,
  action,
  onClose,
  className = '',
}: AlertProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-md px-3 py-2 text-sm ${variantStyles[variant]} ${className}`}
    >
      <div className="flex-1">
        {title && <div className="font-medium mb-0.5">{title}</div>}
        {description && (
          <div className="text-xs leading-relaxed opacity-80 whitespace-pre-line">
            {description}
          </div>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onClose && (
        <Button
          size="sm"
          variant="ghost"
          aria-label="Dismiss"
          onClick={onClose}
          className="shrink-0"
        >
          ✕
        </Button>
      )}
    </div>
  );
}
