/**
 * Edge Function: notify-incomplete-profiles
 *
 * Dispara uma Web Push notification para todos os usuários registrados
 * que ainda não completaram o perfil (sem cargo ou loja).
 *
 * Variáveis de ambiente necessárias (Supabase Dashboard → Project Settings → Edge Functions → Secrets):
 *   VAPID_PUBLIC_KEY   — chave pública VAPID em base64url (a MESMA que está em
 *                        js/supabase/push.js; se divergirem, o serviço de push
 *                        rejeita com 403 e nenhuma notificação chega)
 *   VAPID_PRIVATE_KEY  — a chave privada como JWK JSON COMPLETO, não base64url.
 *                        Ex.: {"kty":"EC","crv":"P-256","x":"…","y":"…","d":"…"}
 *                        O código faz JSON.parse nesse valor (ver buildVapidJWT);
 *                        se for gravado como base64url, o parse lança e TODO
 *                        envio falha silenciosamente no catch do sendPush.
 *   VAPID_SUBJECT      — mailto:seu-email@exemplo.com
 *   NOTIFY_SECRET      — segredo para proteger o endpoint (header X-Notify-Secret).
 *                        ATENÇÃO: se não for definido, a checagem é pulada e
 *                        qualquer um pode disparar a notificação para todos.
 *
 * Invocação manual:
 *   curl -X POST https://<project>.supabase.co/functions/v1/notify-incomplete-profiles \
 *        -H "X-Notify-Secret: <NOTIFY_SECRET>"
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

// ── VAPID JWT ─────────────────────────────────────────────────────────────────

function b64uDecode(str: string): Uint8Array {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

function b64uEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function buildVapidJWT(endpoint: string, privateKeyJwk: string, subject: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);

  const header  = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp: now + 86400, sub: subject };

  const headerB64  = b64uEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = b64uEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sigInput   = `${headerB64}.${payloadB64}`;

  // VAPID_PRIVATE_KEY é um JWK JSON completo (inclui x, y, d)
  const jwk = JSON.parse(privateKeyJwk);
  const privKey = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privKey,
    new TextEncoder().encode(sigInput)
  );

  return `${sigInput}.${b64uEncode(sig)}`;
}

// ── Web Push payload encryption (RFC 8291 — aes128gcm) ───────────────────────

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

async function encryptPayload(
  p256dh: string,
  auth: string,
  payload: string
): Promise<Uint8Array> {
  const userPublicKeyRaw = b64uDecode(p256dh);
  const userAuth         = b64uDecode(auth);
  const enc              = new TextEncoder();

  // Ephemeral server key pair
  const serverKP = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKP.publicKey)
  );

  // Import user's P-256 public key
  const userPublicKey = await crypto.subtle.importKey(
    'raw', userPublicKeyRaw, { name: 'ECDH', namedCurve: 'P-256' }, true, []
  );

  // ECDH shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userPublicKey }, serverKP.privateKey, 256
  );

  // PRK via HKDF-Extract: salt=userAuth, IKM=sharedSecret
  // info = "WebPush: info\0" + userPublicKey + serverPublicKey
  const ikmKey = await crypto.subtle.importKey('raw', sharedSecretBits, 'HKDF', false, ['deriveBits']);
  const prkBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF', hash: 'SHA-256',
      salt: userAuth,
      info: concat(enc.encode('WebPush: info\0'), userPublicKeyRaw, serverPublicKeyRaw),
    },
    ikmKey, 256
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prkKey = await crypto.subtle.importKey('raw', prkBits, 'HKDF', false, ['deriveBits']);

  // CEK (16 bytes) and nonce (12 bytes)
  const cekBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: aes128gcm\0') },
    prkKey, 128
  );
  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: nonce\0') },
    prkKey, 96
  );

  // Encrypt with AES-128-GCM; append 0x02 padding delimiter (last record)
  const aesKey = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt']);
  const plaintext = concat(enc.encode(payload), new Uint8Array([0x02]));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, aesKey, plaintext);

  // aes128gcm header: salt(16) + rs(4) + idlen(1) + serverPublicKey(65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);

  return concat(salt, rs, new Uint8Array([serverPublicKeyRaw.length]), serverPublicKeyRaw, new Uint8Array(ciphertext));
}

// ── Send single push ──────────────────────────────────────────────────────────

async function sendPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  notificationPayload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ ok: boolean; status?: number; expired?: boolean }> {
  try {
    const jwt       = await buildVapidJWT(endpoint, vapidPrivateKey, vapidSubject);
    const body      = await encryptPayload(p256dh, auth, JSON.stringify(notificationPayload));

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization':    `vapid t=${jwt},k=${vapidPublicKey}`,
        'Content-Type':     'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL':              '86400',
      },
      body,
    });

    // 410 Gone / 404 = subscription expired, can be deleted
    return { ok: res.ok, status: res.status, expired: res.status === 410 || res.status === 404 };
  } catch (e) {
    console.error('Push send error:', e);
    return { ok: false };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // Protect endpoint with a shared secret
  const notifySecret = Deno.env.get('NOTIFY_SECRET');
  if (notifySecret && req.headers.get('X-Notify-Secret') !== notifySecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? '';
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  const vapidSubject    = Deno.env.get('VAPID_SUBJECT')     ?? 'mailto:admin@mcguias.app';

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Busca usuários com perfil incompleto (sem cargo ou loja)
  const { data: incompleteUsers } = await sb
    .from('profiles')
    .select('id')
    .or('cargo.is.null,loja.is.null');

  if (!incompleteUsers || incompleteUsers.length === 0) {
    return Response.json({ sent: 0, message: 'Nenhum perfil incompleto encontrado.' });
  }

  const userIds = incompleteUsers.map((u: { id: string }) => u.id);

  // Busca subscriptions desses usuários
  const { data: subs } = await sb
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);

  if (!subs || subs.length === 0) {
    return Response.json({ sent: 0, message: 'Nenhuma subscription encontrada.' });
  }

  const notification = {
    title: 'Complete seu perfil! 📋',
    body: 'Adicione seu cargo e restaurante para aparecer no ranking e desbloquear recursos.',
    // Caminho relativo: o sw.js resolve contra a BASE do deploy
    // ('/mcguias/' no GitHub Pages, '/' na Vercel).
    url: 'pages/perfil.html',
    tag: 'mc-perfil-incompleto',
  };

  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];

  for (const sub of subs) {
    const result = await sendPush(
      sub.endpoint, sub.p256dh, sub.auth,
      notification,
      vapidPublicKey, vapidPrivateKey, vapidSubject
    );

    if (result.ok) {
      sent++;
    } else {
      failed++;
      if (result.expired) expiredIds.push(sub.id);
    }
  }

  // Remove subscriptions expiradas
  if (expiredIds.length > 0) {
    await sb.from('push_subscriptions').delete().in('id', expiredIds);
  }

  return Response.json({
    total_incomplete_users: userIds.length,
    total_subscriptions: subs.length,
    sent,
    failed,
    expired_removed: expiredIds.length,
  });
});
