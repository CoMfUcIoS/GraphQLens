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
export interface Rule {
  id: string;
  operationName: string;
  endpoint: string;
  statusCode: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any; // leave as any if arbitrary JSON allowed
  variables?: Record<string, unknown>; // optional: match specific variables
}

export interface Entry {
  id: string;
  har: chrome.devtools.network.Request;
  // Legacy single response body (kept for backward compatibility)
  body?: string;
  // Original server response before any rule transformation/mocking
  originalBody?: string;
  // Transformed/mocked response after applying rules
  transformedBody?: string;
  // Approximate duration (ms) from start to capture (if available)
  durationMs?: number;
  isMocked?: boolean;
}
