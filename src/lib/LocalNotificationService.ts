/**
 * LocalNotificationService.ts
 * 管理本地通知（精确时间，不依赖服务器，完全在设备上运行）
 * 支持:
 *   1. 每日定时提醒（习惯打卡 / 每日问候）
 *   2. 订阅到期提醒（提前 3 天 + 提前 1 天）
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleOn } from '@capacitor/local-notifications';

// 通知 ID 分段，避免冲突
const DAILY_REMINDER_ID = 1000;
const SUBSCRIPTION_BASE_ID = 2000; // 2000 ~ 2999

export interface Subscription {
  name: string;
  expiry: string; // 'YYYY-MM-DD'
}

/**
 * 检查并请求本地通知权限
 */
export async function requestLocalNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') {
      perm = await LocalNotifications.requestPermissions();
    }
    return perm.display === 'granted';
  } catch (e) {
    console.error('[LocalNotif] 权限请求失败', e);
    return false;
  }
}

/**
 * 安排每日定时提醒（每天在指定时间推送）
 * @param timeStr "HH:MM" 格式，例如 "20:00"
 * @param rituals 习惯列表（用于生成提醒内容）
 */
export async function scheduleDailyReminder(timeStr: string, ritualCount: number = 0): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const [hour, minute] = timeStr.split(':').map(Number);

    // 先取消旧的每日提醒，避免重复
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });

    const body = ritualCount > 0
      ? `您今天还有 ${ritualCount} 个习惯等待打卡，加油！💪`
      : '嘿，您的 LifeCanvas 守护提醒准时送达！今天一切安好 ✨';

    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_REMINDER_ID,
          title: 'LifeCanvas 守护提醒',
          body,
          // 每天在指定时间重复
          schedule: {
            on: { hour, minute } as ScheduleOn,
            repeats: true,
            allowWhileIdle: true,
          },
          sound: 'default',
          smallIcon: 'ic_launcher_foreground',
        },
      ],
    });
    console.log(`[LocalNotif] 每日提醒已安排：${timeStr}`);
  } catch (e) {
    console.error('[LocalNotif] 安排每日提醒失败', e);
  }
}

/**
 * 安排订阅到期提醒（提前 3 天 + 提前 1 天各一条）
 * @param subscriptions 订阅列表
 */
export async function scheduleSubscriptionReminders(subscriptions: Subscription[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // 清除旧的所有订阅提醒（ID 范围 2000~2999）
    const oldIds = Array.from({ length: 100 }, (_, i) => ({ id: SUBSCRIPTION_BASE_ID + i }));
    await LocalNotifications.cancel({ notifications: oldIds });

    const notifications: any[] = [];
    let idCounter = SUBSCRIPTION_BASE_ID;
    const now = new Date();

    for (const sub of subscriptions) {
      if (!sub.expiry || !sub.name) continue;
      const expiryDate = new Date(sub.expiry + 'T09:00:00'); // 到期日上午 9 点提醒

      // 提前 3 天
      const threeDaysBefore = new Date(expiryDate);
      threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
      if (threeDaysBefore > now) {
        notifications.push({
          id: idCounter++,
          title: `⏰ 订阅即将到期`,
          body: `「${sub.name}」还有 3 天到期，记得处理！`,
          schedule: { at: threeDaysBefore, allowWhileIdle: true },
          sound: 'default',
          smallIcon: 'ic_launcher_foreground',
        });
      }

      // 提前 1 天
      const oneDayBefore = new Date(expiryDate);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      if (oneDayBefore > now) {
        notifications.push({
          id: idCounter++,
          title: `🚨 订阅明天到期！`,
          body: `「${sub.name}」明天就到期了，请尽快处理！`,
          schedule: { at: oneDayBefore, allowWhileIdle: true },
          sound: 'default',
          smallIcon: 'ic_launcher_foreground',
        });
      }
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
      console.log(`[LocalNotif] 已安排 ${notifications.length} 条订阅到期提醒`);
    }
  } catch (e) {
    console.error('[LocalNotif] 安排订阅提醒失败', e);
  }
}
