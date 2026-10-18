'use client';

import { useEffect, useRef } from 'react';

export type TermLine = {
  id: number;
  level: 'info' | 'ok' | 'err' | 'sys';
  msg: string;
  time: string;
};

export default function Terminal({ lines }: { lines: TermLine[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  const color = (l: TermLine['level']) =>
    l === 'ok' ? 'text-accent' : l === 'err' ? 'text-danger' : l === 'sys' ? 'text-accent2' : 'text-white/70';

  return (
    <div className="bento flex h-full min-h-[300px] flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-[11px] text-white/40">alightforge</span>
      </div>
      <div
        ref={ref}
        className="scroll-thin flex-1 space-y-1 overflow-y-auto bg-black/40 p-4 font-mono text-[12.5px] leading-relaxed"
      >
        {lines.length === 0 && (
          <div className="text-white/30">
            $ forge<span className="animate-blink">_</span>
          </div>
        )}
        {lines.map((l) => (
          <div key={l.id} className="flex gap-2">
            <span className="shrink-0 text-white/25">{l.time}</span>
            <span className={`break-all ${color(l.level)}`}>{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
