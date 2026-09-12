'use client';

import { usePathname } from 'next/navigation';
import { useTrackingNotifications } from '@/lib/tracking-notifications';

export function TrackingNotificationListener() {
  const pathname = usePathname();
  useTrackingNotifications();
  if (pathname === '/login') return null;
  return null;
}
