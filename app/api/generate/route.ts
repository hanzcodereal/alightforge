import { NextRequest } from 'next/server';
import { createAccount, sleep } from '@/lib/amh';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const count = Math.max(1, Math.min(Number(body?.count) || 1, 50));

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: any) => ctrl.enqueue(enc.encode(JSON.stringify(o) + '\n'));
      send({ type: 'start', total: count });

      let ok = 0;
      let fail = 0;

      for (let i = 0; i < count; i++) {
        const n = i + 1;
        send({ type: 'log', level: 'info', msg: `[${n}/${count}] mulai` });
        try {
          const acc = await createAccount();
          ok++;
          send({ type: 'account', success: ok, failed: fail, data: acc });
          send({ type: 'log', level: 'ok', msg: `[${n}/${count}] ok ${acc.email}` });
        } catch (e: any) {
          fail++;
          send({ type: 'error', success: ok, failed: fail });
          send({ type: 'log', level: 'err', msg: `[${n}/${count}] ${e?.message || 'error'}` });
        }
        if (i < count - 1) await sleep(2000);
      }

      send({ type: 'done', total: count, success: ok, failed: fail });
      ctrl.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
    }
