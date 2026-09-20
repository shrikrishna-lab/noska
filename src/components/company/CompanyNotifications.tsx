import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationPlatform } from '../../features/notifications/Provider';
import { NotificationCenter } from '../../platform/widgets/notifications/NotificationCenter';
import type { WidgetRuntimeContext } from '../../platform/widgets/types';
export function CompanyNotificationBell() {
  const [open, setOpen] = useState(false);
  const { unreadCount } = useNotificationPlatform();
  return <><button aria-label={`Notifications, ${unreadCount} unread`} onClick={() => setOpen(true)} className="relative rounded p-2 text-[var(--text)]"><Bell size={17} />{unreadCount > 0 && <span className="absolute -right-1 -top-1 rounded bg-[var(--accent)] px-1 text-[10px] text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}</button><NotificationCenter open={open} onClose={() => setOpen(false)} ctx={{} as WidgetRuntimeContext} /></>;
}
