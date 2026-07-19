import { registerPlugin } from '@capacitor/core';

export interface MediaTrackerPlugin {
  startWatching(): Promise<void>;
  stopWatching(): Promise<void>;
  checkPermissions(): Promise<{ hasNotificationAccess: boolean; hasOverlayAccess: boolean }>;
  requestNotificationAccess(): Promise<void>;
  requestOverlayAccess(): Promise<void>;
}

export const MediaTracker = registerPlugin<MediaTrackerPlugin>('MediaTracker');
