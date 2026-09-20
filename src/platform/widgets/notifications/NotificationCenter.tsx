import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { NotificationInbox } from '../../../features/notifications/Inbox';
import type { WidgetRuntimeContext } from '../types';
export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void; ctx: WidgetRuntimeContext }) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement;
    panel.current?.focus();
    return () => previous?.focus();
  }, [open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[71] bg-black/25" onMouseDown={onClose}><aside ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Notification Center" className="absolute right-3 top-3 bottom-3 w-[480px] max-w-[calc(100vw-24px)] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-xl" onMouseDown={e => e.stopPropagation()} onKeyDown={e => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    if (e.key === 'Tab') {
      const elements = [...panel.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,[tabindex="0"]')];
      const first = elements[0]; const last = elements.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  }}><button aria-label="Close notifications" onClick={onClose} className="ml-auto block p-3"><X size={18} /></button><NotificationInbox compact /></aside></div>;
}
