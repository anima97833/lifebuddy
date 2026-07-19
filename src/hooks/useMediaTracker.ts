import { useEffect } from 'react';
import { MediaTracker } from '../plugins/MediaTrackerPlugin';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export function useMediaTracker(onSessionEnded?: (info: any) => void) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let startedListener: any;
    let endedListener: any;
    let appStateListener: any;

    const setupListeners = async () => {
      startedListener = await MediaTracker.addListener('sessionStarted', (info: any) => {
        console.log('Media session started:', info);
      });

      endedListener = await MediaTracker.addListener('sessionEnded', (info: any) => {
        console.log('Media session ended:', info);
        if (onSessionEnded) {
          onSessionEnded(info);
        }
      });

      appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
        if (isActive) {
          try {
            const result = await MediaTracker.getPendingSessions();
            if (result && result.sessions && result.sessions.length > 0) {
              console.log('Found pending sessions from native layer:', result.sessions);
              result.sessions.forEach((sess: any) => {
                if (onSessionEnded) onSessionEnded(sess);
              });
            }
          } catch (e) {
            console.error('Failed to get pending sessions', e);
          }
        }
      });
    };

    setupListeners();

    return () => {
      if (startedListener) startedListener.remove();
      if (endedListener) endedListener.remove();
      if (appStateListener) appStateListener.remove();
    };
  }, [onSessionEnded]);
}
