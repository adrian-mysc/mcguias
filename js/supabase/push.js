/**
 * push.js — Web Push subscription manager
 *
 * Fluxo:
 *  1. initPush(userId) é chamado após login autenticado
 *  2. Verifica se já existe subscription salva no navegador
 *  3. Se não, solicita permissão e cria nova subscription via PushManager
 *  4. Salva/atualiza a subscription no Supabase (tabela push_subscriptions)
 */

import { supabase } from './config.js';

// Chave pública VAPID gerada para este projeto
const VAPID_PUBLIC_KEY =
  'BDez0HOlLUiF3FeWbGr_cgtUByjDefoQyyqYA6zvUoiV-rlihPTX5hNHcU3vIPOtIV4X4aD7gjwIR0Rtd8dOGcE';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

async function saveSubscription(userId, sub) {
  const { endpoint, keys } = sub.toJSON();
  await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: 'user_id,endpoint' }
  );
}

async function removeStaleSubscriptions(userId, currentEndpoint) {
  // Remove subscriptions antigas deste usuário que não correspondem ao endpoint atual
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .neq('endpoint', currentEndpoint);
}

/**
 * Inicializa push notifications para o usuário autenticado.
 * Deve ser chamado uma vez após o login, com silêncio em falhas.
 */
export async function initPush(userId) {
  if (!userId) return;
  if (!('PushManager' in window)) return; // navegador não suporta

  const reg = await getServiceWorkerRegistration();
  if (!reg) return;

  // Verifica se já existe subscription ativa no navegador
  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    // Só pede permissão se ainda não foi negado
    if (Notification.permission === 'denied') return;

    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    } catch {
      // Usuário recusou ou erro inesperado — silencia
      return;
    }
  }

  try {
    await saveSubscription(userId, sub);
    await removeStaleSubscriptions(userId, sub.endpoint);
  } catch {
    // Falha de rede ao salvar — não bloqueia o usuário
  }
}

/**
 * Remove a subscription do navegador e do Supabase.
 * Chamar no logout.
 */
export async function removePush(userId) {
  const reg = await getServiceWorkerRegistration();
  if (!reg) return;

  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    const { endpoint } = sub.toJSON();
    await sub.unsubscribe().catch(() => {});
    if (userId) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint);
    }
  }
}
