import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { decodeVapidKey } from '@/lib/pushPolicy';
import { VAPID_PUBLIC_KEY } from '@/config/push';

const mocks = vi.hoisted(() => ({ from: vi.fn(), allowed: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/lib/pushPolicy', async (original) => ({ ...await original<typeof import('@/lib/pushPolicy')>(), pushContextAllowed: mocks.allowed }));
import { cleanupPushOnLogout, disablePush, enablePush, resyncPush, setPushUser } from '@/lib/webPush';

// Test the real pure guard separately from the helper's simulated browser context.
const { pushContextAllowed: realGuard } = await vi.importActual<typeof import('@/lib/pushPolicy')>('@/lib/pushPolicy');
describe('production-only push policy', () => {
  it.each(['id-preview--abc.lovable.app', 'preview-v2--abc.gpt-eng.com', 'project--abc-dev.lovable.app', 'x.lovableproject.com', 'beta.lovable.dev', 'localhost'])('rejects preview/dev host %s', (host) => {
    expect(realGuard(true, host, false, true)).toBe(false);
  });
  it('rejects development, insecure contexts and iframes, but permits Wroob production domains', () => {
    expect(realGuard(false, 'wroob.in', false, true)).toBe(false);
    expect(realGuard(true, 'wroob.in', true, true)).toBe(false);
    expect(realGuard(true, 'wroob.in', false, false)).toBe(false);
    expect(realGuard(true, 'wroob.in', false, true)).toBe(true);
    expect(realGuard(true, 'www.wroob.in', false, true)).toBe(true);
  });
  it('decodes the supplied public key as an uncompressed 65-byte key', () => {
    expect(decodeVapidKey(VAPID_PUBLIC_KEY).length).toBe(65);
    expect(decodeVapidKey(VAPID_PUBLIC_KEY)[0]).toBe(4);
  });
});

describe('device subscription lifecycle', () => {
  const requestPermission = vi.fn();
  const unsubscribe = vi.fn();
  const subscribe = vi.fn();
  const getSubscription = vi.fn();
  const register = vi.fn();
  const getRegistration = vi.fn();
  const upsert = vi.fn();
  const abortSignal = vi.fn();
  const eq = vi.fn();
  const subscription = { endpoint: 'https://push.example/device', unsubscribe, toJSON: () => ({ keys: { p256dh: 'public', auth: 'device' } }) };
  const reg = { active: { scriptURL: new URL('/sw.js', location.origin).href }, pushManager: { subscribe, getSubscription } };
  beforeEach(() => {
    vi.useRealTimers(); vi.clearAllMocks(); localStorage.clear();
    mocks.allowed.mockReturnValue(true);
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
    vi.stubGlobal('PushManager', function () {});
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register, getRegistration } });
    getRegistration.mockResolvedValue(reg); register.mockResolvedValue(reg);
    getSubscription.mockResolvedValue(null); subscribe.mockResolvedValue(subscription); unsubscribe.mockResolvedValue(true);
    requestPermission.mockResolvedValue('granted');
    abortSignal.mockResolvedValue({ error: null }); upsert.mockReturnValue({ abortSignal });
    eq.mockReturnValue({ eq });
    mocks.from.mockReturnValue({ upsert, delete: () => ({ eq }) });
    setPushUser(null); setPushUser('alice');
  });
  it('does not prompt or subscribe on startup with default permission', async () => {
    await resyncPush('alice');
    expect(requestPermission).not.toHaveBeenCalled(); expect(subscribe).not.toHaveBeenCalled();
  });
  it('requests permission synchronously on explicit enable and upserts one endpoint for the signed-in user', async () => {
    const result = enablePush('alice');
    expect(requestPermission).toHaveBeenCalledOnce();
    await result;
    expect(subscribe).toHaveBeenCalledOnce();
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'alice', endpoint: subscription.endpoint }), { onConflict: 'endpoint' });
    expect(localStorage.getItem('wroob_push_device_owner')).toBe('alice');
  });
  it('never registers in preview even on enable', async () => {
    mocks.allowed.mockReturnValue(false);
    await expect(enablePush('alice')).rejects.toThrow();
    expect(register).not.toHaveBeenCalled(); expect(requestPermission).not.toHaveBeenCalled();
  });
  it('silent granted resync uses the same existing endpoint without another prompt', async () => {
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission });
    localStorage.setItem('wroob_push_device_owner', 'alice'); getSubscription.mockResolvedValue(subscription);
    await resyncPush('alice');
    expect(upsert).toHaveBeenCalledOnce(); expect(subscribe).not.toHaveBeenCalled(); expect(requestPermission).not.toHaveBeenCalled();
  });
  it('revokes a different user device rather than transferring their row', async () => {
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission });
    localStorage.setItem('wroob_push_device_owner', 'bob'); getSubscription.mockResolvedValue(subscription);
    await resyncPush('alice');
    expect(unsubscribe).toHaveBeenCalledOnce(); expect(upsert).not.toHaveBeenCalled();
  });
  it('unsubscribes before database cleanup on disable', async () => {
    getSubscription.mockResolvedValue(subscription);
    eq.mockReturnValueOnce({ eq }).mockResolvedValueOnce({ error: null });
    await disablePush('alice');
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(eq).toHaveBeenCalledWith('user_id', 'alice'); expect(eq).toHaveBeenCalledWith('endpoint', subscription.endpoint);
    expect(localStorage.getItem('wroob_push_off_alice')).toBe('1');
  });
  it('cancels enablement if the account changes during permission', async () => {
    let resolve: (value: string) => void = () => undefined;
    requestPermission.mockReturnValue(new Promise<string>((done) => { resolve = done; }));
    const result = enablePush('alice'); setPushUser('bob'); resolve('granted'); await result;
    expect(subscribe).not.toHaveBeenCalled(); expect(upsert).not.toHaveBeenCalled();
  });
  it('logout cleanup returns after 2 seconds even when the browser stalls', async () => {
    vi.useFakeTimers(); getRegistration.mockReturnValue(new Promise(() => undefined));
    let done = false; const result = cleanupPushOnLogout('alice').then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(1999); expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1); await result; expect(done).toBe(true); vi.useRealTimers();
  });
});

describe('messaging worker', () => {
  function worker() {
    interface WorkerEvent {
      data?: { json: () => unknown };
      notification?: { close: () => void; data: { url?: string } };
      waitUntil: (promise: Promise<void>) => void;
    }
    const handlers: Record<string, (event: WorkerEvent) => void> = {};
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const clients = { matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn().mockResolvedValue(undefined) };
    runInNewContext(readFileSync('public/sw.js', 'utf8'), { URL, self: { location: { origin: 'https://wroob.in' }, registration: { showNotification }, clients, addEventListener: (type: string, fn: (event: WorkerEvent) => void) => { handlers[type] = fn; } } });
    return { handlers, showNotification, clients };
  }
  it('handles only push and notificationclick, with a safe malformed payload fallback', async () => {
    const { handlers, showNotification } = worker();
    expect(Object.keys(handlers).sort()).toEqual(['notificationclick', 'push']);
    let waiting: Promise<void> = Promise.resolve();
    handlers.push({ data: { json: () => { throw new Error(); } }, waitUntil: (p: Promise<void>) => { waiting = p; } });
    await waiting;
    expect(showNotification).toHaveBeenCalledWith('Wroob', expect.objectContaining({ data: { url: '/notifications' }, icon: '/icons/icon-192.png' }));
  });
  it.each([undefined, '//evil.example/a', 'https://evil.example/a', '/\\evil.example/a'])('uses /notifications for unsafe or absent link %s', async (url) => {
    const { handlers, showNotification } = worker();
    handlers.push({ data: { json: () => ({ title: 'New update', url, tag: 'sender:42' }) }, waitUntil: () => undefined });
    expect(showNotification).toHaveBeenCalledWith('New update', expect.objectContaining({ data: { url: '/notifications' }, tag: 'sender:42' }));
  });
  it('navigates and focuses an existing same-origin window', async () => {
    const { handlers, clients } = worker(); const focus = vi.fn(); const navigate = vi.fn().mockResolvedValue({ focus });
    clients.matchAll.mockResolvedValue([{ url: 'https://wroob.in/profile', navigate }]);
    let waiting: Promise<void> = Promise.resolve();
    handlers.notificationclick({ notification: { close: vi.fn(), data: { url: '/my-applications' } }, waitUntil: (p: Promise<void>) => { waiting = p; } });
    await waiting;
    expect(navigate).toHaveBeenCalledWith('https://wroob.in/my-applications'); expect(focus).toHaveBeenCalledOnce(); expect(clients.openWindow).not.toHaveBeenCalled();
  });
  it('opens a new window on /notifications when there is no existing window', async () => {
    const { handlers, clients } = worker(); let waiting: Promise<void> = Promise.resolve();
    handlers.notificationclick({ notification: { close: vi.fn(), data: {} }, waitUntil: (p: Promise<void>) => { waiting = p; } });
    await waiting; expect(clients.openWindow).toHaveBeenCalledWith('https://wroob.in/notifications');
  });
});
