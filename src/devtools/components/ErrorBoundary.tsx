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
import { Button } from './ui/button';
import { Alert } from './Alert';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  label?: string; // area label for context
};

type ErrorBoundaryState = {
  error: Error | null;
  info: React.ErrorInfo | null;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info });
    // Could emit to background script later for telemetry.
    // chrome.runtime.sendMessage({ type: 'GQLENS_ERROR', error: error.message, componentStack: info.componentStack });
  }

  handleReset = () => {
    this.setState({ error: null, info: null });
  };

  handleCopy = () => {
    const { error, info } = this.state;
    const payload = [
      'GraphQLens UI Error Boundary',
      `Area: ${this.props.label || 'unknown'}`,
      `Message: ${error?.message}`,
      'Stack:',
      error?.stack || '(no stack)',
      'Component Stack:',
      info?.componentStack || '(no component stack)',
    ].join('\n');
    navigator.clipboard.writeText(payload).catch(() => {
      // graceful degrade
    });
  };

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="h-full p-3 flex flex-col gap-3">
          <Alert
            variant="error"
            title={`Something went wrong${this.props.label ? ` in ${this.props.label}` : ''}`}
            description={error.message || 'Unknown error'}
            action={
              <div className="flex gap-2">
                <Button size="xs" variant="outline" onClick={this.handleCopy}>
                  Copy details
                </Button>
                <Button size="xs" onClick={this.handleReset}>
                  Retry
                </Button>
              </div>
            }
          />
          <div className="text-xs font-mono whitespace-pre-wrap bg-muted p-2 rounded max-h-60 overflow-auto">
            {this.state.info?.componentStack}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function withErrorBoundary(label: string, node: React.ReactNode) {
  return <ErrorBoundary label={label}>{node}</ErrorBoundary>;
}
