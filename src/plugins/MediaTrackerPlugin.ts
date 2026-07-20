import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface MediaTrackerPlugin {
  startWatching(): Promise<void>;
  stopWatching(): Promise<void>;
  checkPermissions(): Promise<{ hasNotificationAccess: boolean; hasOverlayAccess: boolean }>;
  requestNotificationAccess(): Promise<void>;
  requestOverlayAccess(): Promise<void>;
  getPendingSessions(): Promise<{ sessions: any[] }>;
  openUrlNatively(options: { url: string }): Promise<void>;
  
  addListener(eventName: 'mediaStateChanged', listenerFunc: (info: { isPlaying: boolean, title: string, packageName: string }) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(eventName: 'sessionStarted', listenerFunc: (info: { isPlaying: boolean, title: string, packageName: string }) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(eventName: 'sessionEnded', listenerFunc: (info: { title: string, packageName: string, durationMs: number, startTime: number }) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
}

export const MediaTracker = registerPlugin<MediaTrackerPlugin>('MediaTracker');
