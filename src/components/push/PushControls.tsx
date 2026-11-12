import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { disablePush, enablePush, getPushState, type PushState } from '@/lib/webPush';

export default function PushControls({ prompt = false, onBusyChange }: { prompt?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const { user, role } = useAuth();
  const [state, setState] = useState<PushState>('unsupported');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    let active = true;
    setDismissed(false);
    if (!user) return;
    try { setDismissed(localStorage.getItem(`wroob_push_prompt_${user.id}`) === 'dismissed'); } catch { /* Optional preference. */ }
    const refresh = () => { void getPushState(user.id).then((next) => { if (active) setState(next); }).catch(() => { if (active) setState('off'); }); };
    refresh();
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, [user]);
  if (!user || (role !== 'student' && role !== 'employer') || state === 'unsupported' || (prompt && (dismissed || state !== 'default'))) return null;
  const run = async () => {
    setBusy(true); setError(''); onBusyChange?.(true);
    try {
      if (state === 'enabled') await disablePush(user.id); else await enablePush(user.id);
      setState(await getPushState(user.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update notifications. Please try again.');
      setState(await getPushState(user.id).catch(() => 'off' as const));
    } finally { setBusy(false); onBusyChange?.(false); }
  };
  return (
    <section aria-label="Device notifications" className="my-6 flex w-full flex-wrap items-center justify-between gap-4 border-y border-border py-6 text-left">
      <div className="min-w-0 flex-1 basis-48">
        <h2 className="font-display text-lg font-bold">Device notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {state === 'denied' ? 'Notifications are blocked. Allow them in your browser or Android app settings.' : state === 'enabled' ? 'Notifications are enabled on this device.' : 'Get Wroob updates on this device.'}
        </p>
        {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
      {state !== 'denied' && <Button type="button" variant={state === 'enabled' ? 'outline' : 'default'} onClick={() => void run()} disabled={busy} className="gap-2" aria-busy={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : state === 'enabled' ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {busy ? 'Updating…' : state === 'enabled' ? 'Turn off notifications' : 'Enable notifications'}
      </Button>}
      {prompt && <Button type="button" variant="ghost" size="icon" aria-label="Dismiss notification prompt" disabled={busy} onClick={() => {
        setDismissed(true);
        try { localStorage.setItem(`wroob_push_prompt_${user.id}`, 'dismissed'); } catch { /* Optional preference. */ }
      }}><X className="h-4 w-4" /></Button>}
    </section>
  );
}
