import { useEffect } from 'react';
import { MediaTracker } from '../plugins/MediaTrackerPlugin';
import { Capacitor } from '@capacitor/core';
import { useSyncState } from '@/hooks/useSyncState';

export function useMediaTracker() {
  const [projects, setProjects] = useSyncState<any[]>('summaryProjects', []);

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
        // Automatically save to a default project if we have one, or just add a new sub-item
        // to a "Learning Inbox" project.
        saveSessionToInbox(info);
      });
    };

    setupListeners();

    return () => {
      if (startedListener) startedListener.remove();
      if (endedListener) endedListener.remove();
    };
  }, [projects]);

  const saveSessionToInbox = (info: { title: string, durationMs: number, packageName: string }) => {
    const minutes = Math.ceil(info.durationMs / 60000);
    const dateStr = new Date().toISOString().split('T')[0];
    const newRecord = {
      id: Date.now().toString(),
      date: dateStr,
      details: `Watched: ${info.title} (${minutes} mins)`,
      feeling: "neutral",
      createdAt: Date.now(),
      isAutomated: true,
      source: info.packageName
    };

    setProjects(prev => {
      const copy = [...(prev || [])];
      let inbox = copy.find(p => p.name === 'Auto-Tracked Learning');
      if (!inbox) {
        inbox = {
          id: 'auto-tracked-' + Date.now(),
          name: 'Auto-Tracked Learning',
          startDate: dateStr,
          endDate: '2099-12-31',
          progress: 0,
          total: 100,
          unit: 'mins',
          completedRecords: [newRecord]
        };
        copy.push(inbox);
      } else {
        inbox.completedRecords.push(newRecord);
        inbox.progress += minutes;
      }
      return copy;
    });
  };
}
