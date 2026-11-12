import { supabase } from '@/integrations/supabase/client';
import { VAPID_PUBLIC_KEY } from '@/config/push';
import { decodeVapidKey, pushContextAllowed } from './pushPolicy';

export type PushState = 'unsupported' | 'default' | 'denied' | 'off' | 'enabled';
let currentUser: string | null = null;
let revision = 0;
let pendingWrite: AbortController | null = null;
const ownerKey = 'wroob_push_device_owner';
const offKey = (id: string) => `wroob_push_off_${id}`;
const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string | null) => { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* Optional preferences only. */ } };
export function setPushUser(id: string | null) {
  if (currentUser === id) return;
  currentUser = id;
  revision++;
  pendingWrite?.abort();
}
export function pushSupported() {
  return pushContextAllowed(import.meta.env.PROD, window.location.hostname, window.self !== window.top, window.isSecureContext) &&
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
async function registration(create: boolean) {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing && (existing.active || existing.installing || existing.waiting)?.scriptURL === new URL('/sw.js', location.origin).href) return existing;
  if (!create) return null;
  if (existing) throw new Error('Another notification service is already registered.');
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
  if (!reg.active) {
    await new Promise<void>((resolve, reject) => {
      const worker = reg.installing || reg.waiting;
      if (!worker) { reject(new Error('Notification service unavailable.')); return; }
      const timer = window.setTimeout(() => { worker.removeEventListener('statechange', changed); reject(new Error('Notification setup timed out.')); }, 10000);
      function changed() {
        if (worker?.state === 'activated' || worker?.state === 'redundant') {
          clearTimeout(timer); worker.removeEventListener('statechange', changed);
          if (worker.state === 'activated') resolve(); else reject(new Error('Notification service unavailable.'));
        }
      }
      worker.addEventListener('statechange', changed); changed();
    });
  }
  return reg;
}
export async function getPushState(userId: string): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission !== 'granted') return Notification.permission;
  const reg = await registration(false);
  const subscription = await reg?.pushManager.getSubscription();
  if (!subscription || read(ownerKey) !== userId) return 'off';
  const { data, error } = await supabase.from('push_subscriptions').select('id').eq('endpoint', subscription.endpoint).eq('user_id', userId).maybeSingle();
  return !error && data ? 'enabled' : 'off';
}
async function saveSubscription(userId: string, subscription: PushSubscription, version: number) {
  if (currentUser !== userId || revision !== version) { await subscription.unsubscribe(); return; }
  const json = subscription.toJSON();
  if (!json.keys?.p256dh || !json.keys.auth) throw new Error('Device subscription is incomplete.');
  const controller = new AbortController();
  pendingWrite = controller;
  const timer = window.setTimeout(() => controller.abort(), 10000);
  try {
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId, endpoint: subscription.endpoint, p256dh: json.keys.p256dh,
      auth: json.keys.auth, user_agent: navigator.userAgent,
    }, { onConflict: 'endpoint' }).abortSignal(controller.signal);
    if (error) throw new Error('Could not save notifications for this device. Please try again.');
    if (currentUser !== userId || revision !== version) { await subscription.unsubscribe(); return; }
    write(ownerKey, userId); write(offKey(userId), null);
  } finally { clearTimeout(timer); if (pendingWrite === controller) pendingWrite = null; }
}
// Called only from the Enable button. Request permission before the first await.
export async function enablePush(userId: string) {
  if (!pushSupported() || currentUser !== userId) throw new Error('Notifications are unavailable here.');
  const version = revision;
  const permissionPromise = Notification.permission === 'default' ? Notification.requestPermission() : Promise.resolve(Notification.permission);
  const permission = await permissionPromise;
  if (permission !== 'granted') return;
  if (currentUser !== userId || version !== revision) return;
  const reg = await registration(true);
  if (!reg || currentUser !== userId || version !== revision) return;
  let subscription = await reg.pushManager.getSubscription();
  // Never reassign another account's endpoint; rotate it instead. RLS remains authoritative.
  if (subscription && read(ownerKey) !== userId) {
    if (!await subscription.unsubscribe()) throw new Error('Could not reset this device.');
    subscription = null;
  }
  subscription ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(VAPID_PUBLIC_KEY) });
  try { await saveSubscription(userId, subscription, version); }
  catch (error) { await subscription.unsubscribe().catch(() => false); throw error; }
}
export async function resyncPush(userId: string) {
  if (!pushSupported() || Notification.permission !== 'granted' || read(offKey(userId)) === '1') return;
  const version = revision;
  const reg = await registration(false);
  const subscription = await reg?.pushManager.getSubscription();
  if (!subscription) return; // No new subscription or permission prompt on page load.
  if (currentUser !== userId || revision !== version) return;
  if (read(ownerKey) !== userId) { await subscription.unsubscribe(); return; }
  await saveSubscription(userId, subscription, version);
}
export async function disablePush(userId: string, signal?: AbortSignal) {
  revision++; pendingWrite?.abort();
  const version = revision;
  write(offKey(userId), '1');
  if (!pushSupported()) return;
  const reg = await registration(false);
  const subscription = await reg?.pushManager.getSubscription();
  if (signal?.aborted || revision !== version) return;
  if (!subscription) { write(ownerKey, null); return; }
  // Browser revocation first: prevents delivery even if row cleanup fails.
  if (!await subscription.unsubscribe()) throw new Error('Could not turn off notifications. Please try again.');
  if (signal?.aborted || revision !== version) return;
  write(ownerKey, null);
  const deletion = supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint);
  const { error } = await (signal ? deletion.abortSignal(signal) : deletion);
  if (error) throw new Error('Notifications are off, but device cleanup needs another try.');
}
export async function cleanupPushOnLogout(userId: string) {
  setPushUser(null); // Cancel pending enabling/resync before losing authentication.
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      disablePush(userId, controller.signal).catch(() => undefined),
      new Promise<void>((resolve) => { timer = setTimeout(() => { controller.abort(); resolve(); }, 2000); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}
