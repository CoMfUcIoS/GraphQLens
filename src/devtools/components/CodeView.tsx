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
import { useEffect, useRef } from 'react';
import React from 'react';
import * as monaco from 'monaco-editor';
import { createEditor } from '../main';

type Props = {
  code: string;
  language: 'graphql' | 'json' | 'text';
  height?: number | string;
};
function CodeView({ code, language, height = 300 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    editorRef.current = createEditor(ref.current, {
      value: code,
      language,
      readOnly: true,
      automaticLayout: true,
      minimap: { enabled: false },
    });
    return () => editorRef.current?.dispose();
  }, [code, language]);
  useEffect(() => {
    editorRef.current?.setValue(code);
  }, [code]);
  return (
    <div
      ref={ref}
      style={{ height }}
      className="rounded border border-border"
    />
  );
}

export default React.memo(CodeView, (prev, next) => {
  return (
    prev.code === next.code &&
    prev.language === next.language &&
    prev.height === next.height
  );
});
