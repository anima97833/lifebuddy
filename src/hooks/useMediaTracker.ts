import { useEffect } from 'react';
import { MediaTracker } from '../plugins/MediaTrackerPlugin';
import { Capacitor } from '@capacitor/core';
import { useSyncState } from '@/hooks/useSyncState';

export function useMediaTracker(onSessionEnded?: (info: any) => void) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let startedListener: any;
    let endedListener: any;

    const setupListeners = async () => {
      // @ts-ignore
      startedListener = await MediaTracker.addListener('sessionStarted', (info: any) => {
        console.log('Media session started:', info);
      });

      // @ts-ignore
      endedListener = await MediaTracker.addListener('sessionEnded', (info: any) => {
        console.log('Media session ended:', info);
        if (onSessionEnded) {
          onSessionEnded(info);
        }
      });
    };

    setupListeners();

    return () => {
      if (startedListener) startedListener.remove();
      if (endedListener) endedListener.remove();
    };
  }, [onSessionEnded]);
}
