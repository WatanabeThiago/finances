'use client';

import { useTrackingNotifications } from '@/lib/tracking-notifications';

export function TrackingNotificationListener() {
  useTrackingNotifications();
  return null;
}
