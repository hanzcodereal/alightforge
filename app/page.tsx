'use client';

import { useMemo, useRef, useState } from 'react';
import Terminal, { TermLine } from '@/components/Terminal';

type Account = {
  email: string;
  inbox: string;
  status: true;
  uid: string | null;
  orderId: string | null;
  membershipStatus: string;
  planName: string;
  validUntil: string;
  features: string[];
};

export default function Home() {
  const [count, setCount] = useState(1);
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<TermLine[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });
  const idRef = useRef(0);

  const push = (level: TermLine['level'], msg: string) => {
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    setLines((p) => [...p, { id: ++idRef.current, level, msg, time }]);
  };

  const start = async () => {
    if (running) return;
    setRunning(true);
    setAccounts([]);
    setLines([]);
    setStats({ total: count, success: 0, failed: 0 });
    push('sys', `$ forge build --count ${count}`);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      if (!res.body) throw new Error('stream error');

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n');
        buf = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;
          let evt: any;
          try {
            evt = JSON.parse(part);
          } catch {
            continue;
          }
          if (evt.type === 'log') push(evt.level, evt.msg);
          else if (evt.type === 'account') {
            setAccounts((p) => [...p, evt.data]);
            setStats({ total: count, success: evt.success, failed: evt.failed });
          } else if (evt.type === 'error') {
            setStats({ total: count, success: evt.success, failed: evt.failed });
          } else if (evt.type === 'done') {
            setStats({ total: evt.total, success: evt.success, failed: evt.failed });
            if (Array.isArray(evt.results) && evt.results.length) {
              setAccounts(evt.results.filter((r: any) => r.status === true));
            }
            push('sys', `$ selesai — ${evt.success} ok / ${evt.failed} gagal`);
          }
        }
      }
    } catch (e: any) {
      push('err', e?.message || 'error');
    } finally {
      setRunning(false);
    }
  };

  const copyAll = () => {
    const payload = { total: accounts.length, success: accounts.length, failed: 0, results: accounts };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    push('sys', '$ disalin');
  };

  const downloadJson = () => {
    const payload = { total: accounts.length, success: accounts.length, failed: 0, results: accounts };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alightforge-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const progress = useMemo(
    () => (stats.total ? Math.round(((stats.success + stats.failed) / stats.total) * 100) : 0),
    [stats]
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-panel text-lg font-extrabold text-accent">
            A
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white md:text-2xl">
            Alight<span className="text-accent">Forge</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            className="w-16 rounded-lg border border-line bg-panel px-3 py-2 font-mono text-sm text-white outline-none"
            disabled={running}
          />
          <button
            onClick={start}
            disabled={running}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-40"
          >
            {running ? '...' : 'Generate'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-3">
        <div className="bento col-span-4 p-4">
          <div className="text-[11px] uppercase tracking-wider text-white/40">Total</div>
          <div className="mt-1 font-mono text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="bento col-span-4 p-4">
          <div className="text-[11px] uppercase tracking-wider text-white/40">Ok</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-accent">{stats.success}</div>
        </div>
        <div className="bento col-span-4 p-4">
          <div className="text-[11px] uppercase tracking-wider text-white/40">Gagal</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-danger">{stats.failed}</div>
        </div>

        <div className="bento col-span-12 p-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent2 to-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <Terminal lines={lines} />
        </div>

        <div className="bento col-span-12 flex flex-col overflow-hidden lg:col-span-7">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="font-mono text-[11px] text-white/40">
              akun · {accounts.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={copyAll}
                disabled={!accounts.length}
                className="rounded-md border border-line px-2.5 py-1 text-[11px] text-white/60 hover:text-white disabled:opacity-30"
              >
                copy
              </button>
              <button
                onClick={downloadJson}
                disabled={!accounts.length}
                className="rounded-md border border-line px-2.5 py-1 text-[11px] text-white/60 hover:text-white disabled:opacity-30"
              >
                json
              </button>
            </div>
          </div>
          <div className="scroll-thin max-h-[420px] flex-1 space-y-2 overflow-y-auto p-3">
            {accounts.length === 0 && (
              <div className="p-8 text-center text-xs text-white/25">kosong</div>
            )}
            {accounts.map((a, i) => (
              <div key={i} className="rounded-lg border border-line bg-black/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-sm text-accent">{a.email}</span>
                  <span className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                    PRO
                  </span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-white/35">
                  {new Date(a.validUntil).toLocaleDateString('id-ID')} · {a.uid ?? '-'}
                </div>
                <div className="mt-1 font-mono text-[10px] text-white/25 truncate">{a.orderId ?? '-'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center font-mono text-[10px] text-white/20">
        alightforge
      </footer>
    </main>
  );
                     }
