import axios from 'axios';
import { toJSON } from 'seroval';

const BASE_HANZZ = 'https://am-premium-hanzz.vercel.app';
const BASE_GENEMAIL = 'https://generator.email';
const FN_SEND = '25d7ce74f235572d2a1c16bd9ad28b886affdf03cb809065045a8925c7206950';
const FN_VERIFY = '0b242e6b2deb78eb17b2d0f566d63a0314db7bc98fbb81c7afbabbf756853be5';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const HEADERS: Record<string, string> = {
  'User-Agent': UA,
  Referer: `${BASE_HANZZ}/aktivasi`,
  Origin: BASE_HANZZ,
  'x-tsr-serverfn': 'true',
  accept: 'application/json',
  'content-type': 'application/json',
};

export const FEATURES = [
  'Hapus Tanda Air',
  'Paket Efek Keanggotaan',
  'Berbagi Paket Proyek',
  'Fitur Khusus Anggota yang Akan Datang',
  'Easing Tingkat Lanjut',
  'Objek Kamera',
  'Induk Layer',
  'Penyimpanan cloud (100GB)',
  'Support 5mb+',
  'Aman',
];

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseSeroval(node: any): any {
  if (!node || typeof node !== 'object') return node;
  if (node.t === 1) return node.s;
  if (node.t === 0) return node.s;
  if (node.t === 2) return node.s === 2 ? true : node.s === 1 ? false : null;
  if (node.t === 9) return (node.a || []).map(parseSeroval);
  if ((node.t === 10 || node.t === 11) && node.p) {
    const obj: Record<string, any> = {};
    for (let i = 0; i < node.p.k.length; i++) obj[node.p.k[i]] = parseSeroval(node.p.v[i]);
    return obj;
  }
  return node;
}

function serializePayload(val: any): any {
  try {
    return toJSON(val);
  } catch {
    let id = 0;
    const walk = (v: any): any => {
      if (typeof v === 'string') return { t: 1, s: v };
      if (typeof v === 'number') return { t: 0, s: v };
      if (typeof v === 'boolean') return { t: 2, s: v ? 2 : 1 };
      if (v === null) return { t: 2, s: 0 };
      if (Array.isArray(v)) return { t: 9, i: id++, a: v.map(walk), o: 0 };
      if (typeof v === 'object') {
        const k = Object.keys(v);
        return { t: 10, i: id++, p: { k, v: k.map((x) => walk(v[x])) }, o: 0 };
      }
      return undefined;
    };
    return { t: walk(val), f: 127, m: [] };
  }
}

export async function sendLink(email: string) {
  if (!email || !email.includes('@')) throw new Error('Email tidak valid');
  const payload = serializePayload({ data: { email: email.trim() } });
  const res = await axios.post(`${BASE_HANZZ}/_serverFn/${FN_SEND}`, payload, {
    headers: HEADERS,
    timeout: 15000,
  });
  const result = parseSeroval(res.data)?.result;
  if (!result?.ok) throw new Error(result?.message || 'Gagal kirim link');
  return { status: true, message: result.message, email: email.trim() };
}

export async function verifyLink(email: string, magicLink: string) {
  if (!email?.includes('@')) throw new Error('Email tidak valid');
  if (!magicLink?.trim()) throw new Error('Link kosong');

  const payload = serializePayload({ data: { email: email.trim(), magicLink: magicLink.trim() } });
  const res = await axios.post(`${BASE_HANZZ}/_serverFn/${FN_VERIFY}`, payload, {
    headers: HEADERS,
    timeout: 15000,
  });
  const result = parseSeroval(res.data)?.result;
  if (!result?.ok) throw new Error(result?.message || 'Verifikasi gagal');

  const d = result.data || {};
  const now = new Date();
  now.setFullYear(now.getFullYear() + 1);

  return {
    email: d.email || email.trim(),
    uid: d.uid || null,
    orderId: d.orderId || null,
    membershipStatus: 'PREMIUM_ACTIVE',
    planName: 'Alight Motion Pro / Member',
    validUntil: now.toISOString(),
  };
}

async function getEmailSession() {
  const init = await axios.get(`${BASE_GENEMAIL}/`, {
    headers: { 'User-Agent': UA },
    timeout: 10000,
  });
  const cookies: string[] = init.headers['set-cookie'] || [];
  const hp = cookies.find((c) => c?.startsWith('__Host-ab_hp='));
  const ctx = cookies.find((c) => c?.startsWith('inbox_ctx='));

  let domain = 'heyzalo.vn';
  if (ctx) {
    try {
      const dec = decodeURIComponent(ctx.split(';')[0].split('=')[1]);
      const ex = dec.split('/')[0];
      if (ex) domain = ex;
    } catch {}
  }
  return { domain, hpCookieHeader: hp ? hp.split(';')[0] : '' };
}

function randomUser() {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let u = 'amhanzz';
  for (let i = 0; i < 5; i++) u += c.charAt(Math.floor(Math.random() * c.length));
  return u + Math.floor(Math.random() * 89 + 10);
}

async function fetchMagicLink(domain: string, user: string, hp: string, max = 10) {
  const ctx = encodeURIComponent(`${domain}/${user}/`);
  const cookie = `inbox_ctx=${ctx}; ${hp}`;
  for (let i = 1; i <= max; i++) {
    await sleep(i === 1 ? 5000 : 3500);
    try {
      const res = await axios.get(`${BASE_GENEMAIL}/inbox1/`, {
        headers: { 'User-Agent': UA, Cookie: cookie },
        timeout: 10000,
      });
      const links: string[] = (res.data as string).match(/https?:\/\/[^\s"'<>]+/gi) || [];
      const found = links.find(
        (l) =>
          (l.includes('alight-creative.firebaseapp.com') || l.includes('alightcreative.com')) &&
          (l.includes('signInWithEmailLink') || l.includes('auth_action') || l.includes('links?link='))
      );
      if (found) return found.replace(/&amp;/g, '&');
    } catch {}
  }
  throw new Error('Timeout menunggu email');
}

export type AccountResult = {
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

export async function createAccount(): Promise<AccountResult> {
  const { domain, hpCookieHeader } = await getEmailSession();
  const user = randomUser();
  const email = `${user}@${domain}`;

  await sendLink(email);
  const magicLink = await fetchMagicLink(domain, user, hpCookieHeader);
  const v = await verifyLink(email, magicLink);

  return {
    email,
    inbox: `${BASE_GENEMAIL}/${email}`,
    status: true,
    uid: v.uid,
    orderId: v.orderId,
    membershipStatus: v.membershipStatus,
    planName: v.planName,
    validUntil: v.validUntil,
    features: FEATURES,
  };
}
