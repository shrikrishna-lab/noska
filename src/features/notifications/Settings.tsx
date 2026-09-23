import React, { useEffect, useRef, useState } from 'react';
import { useNotificationPlatform } from './Provider';
import { loadPreferences, savePreferences } from './preferences';
import { deliveryCapabilities, enableWebPush, requestDesktopPermission, revokeWebPush } from './delivery';
import type { NotificationPreferences } from './types';
import { getDesktopPreferences, updateDesktopPreferences, type DesktopPreferences } from '../../lib/desktopNotificationLifecycle';
export default function NotificationSettings() {
  // NOTE: userId here is the resolved notification identity (null until the
  // server links it), NOT the sign-in state — a signed-in user with a
  // linking failure must see the real error, never "Sign in…".
  const { userId, error: platformError } = useNotificationPlatform();
  const retryIdentity = () => {
    // Re-runs the provider's identity resolution without losing modal state.
    window.dispatchEvent(new Event('online'));
    setReload(value => value + 1);
  };
  const identity = useRef(userId);
  identity.current = userId;
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [desktop, setDesktop] = useState<DesktopPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setPreferences(null); setError(''); setSaved(false);
    if (userId) void loadPreferences(userId).then(value => { if (active) setPreferences(value); }).catch(() => { if (active) setError('Could not load notification preferences.'); });
    void getDesktopPreferences().then(value => { if (active) setDesktop(value); }).catch(() => {});
    return () => { active = false; };
  }, [userId, reload]);
  const save = async (patch: Partial<NotificationPreferences>) => {
    if (!userId || busy || !preferences) return;
    const previous = preferences;
    setBusy(true); setError(''); setSaved(false); setPreferences({ ...previous, ...patch });
    try {
      const result = await savePreferences(userId, patch);
      if (identity.current === userId) { setPreferences({ ...previous, ...result }); setSaved(true); }
    } catch {
      if (identity.current === userId) { setPreferences(previous); setError('Preferences were not saved. Previous settings restored.'); }
    } finally { if (identity.current === userId) setBusy(false); }
  };
  const capability = deliveryCapabilities();
  const gesture = async (channel: 'desktop' | 'push', enable: boolean) => {
    if (!userId || busy) return;
    setBusy(true); setError(''); setSaved(false);
    try {
      if (channel === 'desktop' && enable && !await requestDesktopPermission()) throw new Error('Desktop notification permission was not granted.');
      if (channel === 'push') {
        if (enable) await enableWebPush(userId, () => identity.current === userId);
        else await revokeWebPush(userId);
      }
      if (identity.current !== userId) return;
      const next = await savePreferences(userId, channel === 'desktop' ? { desktop_enabled: enable } : { push_enabled: enable });
      if (identity.current === userId) { setPreferences(next); setSaved(true); }
    } catch (reason) { if (identity.current === userId) setError(reason instanceof Error ? reason.message : 'Delivery setting could not be saved.'); }
    finally { if (identity.current === userId) setBusy(false); }
  };
  const checkbox = (key: 'enabled' | 'in_app_enabled' | 'desktop_preview' | 'desktop_sound' | 'desktop_when_focused' | 'quiet_hours_enabled', label: string) => <label className="flex items-center justify-between gap-4 py-2"><span>{label}</span><input type="checkbox" checked={preferences?.[key] ?? false} disabled={busy} onChange={e => void save({ [key]: e.target.checked })} /></label>;
  return <section className="max-w-2xl space-y-5 p-6 text-sm text-[var(--text)]"><header><h2 className="text-xl font-semibold">Notifications</h2><p className="mt-1 text-[var(--muted)]">Choose what reaches your Inbox and this device.</p></header>
    {error && <p role="alert" className="rounded border border-red-500/30 p-3">{error} <button onClick={() => setReload(value => value + 1)} className="underline">Retry</button></p>}
    {!preferences ? (platformError
      ? <p role="alert">{platformError} <button onClick={retryIdentity} className="underline">Retry</button></p>
      : <p role="status">{userId ? 'Loading preferences…' : 'Sign in to manage notifications.'}</p>) : <>
      <fieldset disabled={busy}>{checkbox('enabled', 'Enable notifications')}{checkbox('in_app_enabled', 'Show new events in Inbox')}
        <h3 className="mt-4 font-semibold">Activity</h3>{['mention', 'reply', 'comment', 'invite', 'assignment', 'reminder', 'system'].map(category => <label key={category} className="flex justify-between py-2 capitalize">{category}<input type="checkbox" checked={preferences.category_settings[category] !== false} onChange={e => void save({ category_settings: { ...preferences.category_settings, [category]: e.target.checked } })} /></label>)}
      </fieldset>
      <div className="border-t border-[var(--border)] pt-4"><h3 className="font-semibold">Delivery</h3><p className="my-2 text-xs text-[var(--muted)]">Desktop notifications work only while Noska is running, including in the tray. Click-through and action buttons are not supported by the desktop plugin.</p><button disabled={busy || !capability.find(c => c.channel === 'desktop')?.available} onClick={() => void gesture('desktop', !preferences.desktop_enabled)} className="rounded border border-[var(--border)] px-3 py-2 disabled:opacity-40">{preferences.desktop_enabled ? 'Disable desktop notifications' : 'Enable desktop notifications'}</button>{checkbox('desktop_preview', 'Show notification content in desktop previews')}{checkbox('desktop_sound', 'Desktop sound')}{checkbox('desktop_when_focused', 'Notify while Noska is focused')}
        <button disabled={busy || (!preferences.push_enabled && !capability.find(c => c.channel === 'push')?.available)} onClick={() => void gesture('push', !preferences.push_enabled)} className="mt-3 rounded border border-[var(--border)] px-3 py-2 disabled:opacity-40">{preferences.push_enabled ? 'Revoke web push on this browser' : 'Enable web push on this browser'}</button><p className="mt-2 text-xs text-[var(--muted)]">Web push requires a configured server worker and VAPID public key. Browser delivery is best effort. Permission is requested only when you enable it.</p>
        <p className="mt-4"><input type="checkbox" disabled checked={false} readOnly /> Email — not available yet</p><p className="mt-2"><input type="checkbox" disabled checked={false} readOnly /> Native mobile push — not available yet</p>
      </div>
      <fieldset disabled={busy} className="border-t border-[var(--border)] pt-4"><h3 className="font-semibold">Quiet hours</h3>{checkbox('quiet_hours_enabled', 'Pause delivery during quiet hours')}<label className="block py-2">Time zone<input key={preferences.timezone} defaultValue={preferences.timezone} onBlur={e => { if (e.target.value !== preferences.timezone) void save({ timezone: e.target.value }); }} className="ml-3 rounded border border-[var(--border)] bg-transparent p-2" /></label><div className="flex gap-4"><label>From <input type="time" value={preferences.quiet_hours_start?.slice(0, 5) || '22:00'} onChange={e => void save({ quiet_hours_start: e.target.value })} /></label><label>Until <input type="time" value={preferences.quiet_hours_end?.slice(0, 5) || '08:00'} onChange={e => void save({ quiet_hours_end: e.target.value })} /></label></div></fieldset>
    </>}
    {desktop && <fieldset disabled={busy} className="border-t border-[var(--border)] pt-4"><h3 className="font-semibold">Desktop lifecycle</h3>{(['closeToTray', 'autostart', 'launchMinimized', 'notificationsPaused'] as const).map(key => <label key={key} className="flex justify-between py-2">{{ closeToTray: 'Keep running in tray when closed', autostart: 'Start at login', launchMinimized: 'Launch minimized', notificationsPaused: 'Pause notifications on this device' }[key]}<input type="checkbox" checked={desktop[key]} onChange={e => {
      setBusy(true); setError('');
      void updateDesktopPreferences({ [key]: e.target.checked }).then(value => { if (value) setDesktop(value); }).catch(() => setError('Desktop preference could not be saved.')).finally(() => setBusy(false));
    }} /></label>)}</fieldset>}
    <p role="status" className="text-xs text-[var(--muted)]">{busy ? 'Saving…' : saved ? 'Saved' : ''}</p>
  </section>;
}
