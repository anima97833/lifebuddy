import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabase } from '@/lib/supabase';

webpush.setVapidDetails(
  'mailto:support@lifecanvas.example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 从 Supabase 查询所有用户的推送信标
    const { data: pushSubs, error: pushError } = await supabase
      .from('user_state')
      .select('user_id, value')
      .eq('key', 'pushSub');

    if (pushError) throw pushError;

    let pushedCount = 0;

    for (const subRow of pushSubs) {
      const userId = subRow.user_id;
      const pushSub = subRow.value;
      if (!pushSub) continue;

      // 并发查询该用户的 habits, subscriptions, 提醒时间和上次推送时间
      const { data: userStates, error: stateError } = await supabase
        .from('user_state')
        .select('key, value')
        .eq('user_id', userId)
        .in('key', ['subscriptions', 'rituals', 'notificationTime', 'lastNotifiedDate']);

      if (stateError) continue;

      let subscriptions: any[] = [];
      let rituals: any[] = [];
      let notificationTime = '20:00';
      let lastNotifiedDate = '';

      userStates.forEach(row => {
        if (row.key === 'subscriptions') subscriptions = row.value || [];
        if (row.key === 'rituals') rituals = row.value || [];
        if (row.key === 'notificationTime') notificationTime = String(row.value);
        if (row.key === 'lastNotifiedDate') lastNotifiedDate = String(row.value);
      });

      const notificationsToSend: string[] = [];
      
      // ✅ 修复时区 Bug：将服务器 UTC 时间转换为北京时间 (UTC+8)
      const nowUTC = new Date();
      const beijingOffset = 8 * 60; // 北京时间 UTC+8，偏移 480 分钟
      const now = new Date(nowUTC.getTime() + beijingOffset * 60 * 1000);
      
      // 用北京时间生成今天的日期字符串 (YYYY-MM-DD)
      const todayStr = now.toISOString().slice(0, 10);
      
      // 解析用户设定的提醒时间 (格式如 "23:23")
      const [targetHour, targetMinute] = notificationTime.split(':').map(Number);
      const currentHour = now.getUTCHours(); // 此时 now 已经是北京时间，用 getUTCHours() 读取
      const currentMinute = now.getUTCMinutes();
      
      // 如果还没到设定的时间，则跳过该用户
      const isTimePassed = currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute);
      if (!isTimePassed) {
        continue;
      }

      const nowMidnight = new Date(now);
      nowMidnight.setUTCHours(0, 0, 0, 0);

      // 1. 检查订阅
      if (Array.isArray(subscriptions)) {
        subscriptions.forEach((sub: any) => {
          if (sub.expiry) {
            const expiryDate = new Date(sub.expiry + 'T00:00:00');
            const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 3) {
              notificationsToSend.push(`您的订阅项「${sub.name}」还有 ${diffDays} 天即将到期。`);
            }
          }
        });
      }

      // 2. 检查习惯
      if (Array.isArray(rituals)) {
        let uncompletedRituals = 0;
        rituals.forEach((ritual: any) => {
          const lastCheckIn = ritual.lastCheckInDate ? new Date(ritual.lastCheckInDate) : null;
          // 用北京时间比较打卡日期
          const todayBeijing = todayStr;
          const lastCheckInDate = lastCheckIn ? lastCheckIn.toISOString().slice(0, 10) : null;
          if (!lastCheckInDate || lastCheckInDate !== todayBeijing) {
            uncompletedRituals++;
          }
        });
        if (uncompletedRituals > 0) {
          notificationsToSend.push(`您今天还有 ${uncompletedRituals} 个习惯未打卡，记得完成哦。`);
        }
      }

      // ✅ 修复 Bug 2：即使没有待办内容，到时间也发保底问候（确保推送链路通畅）
      if (notificationsToSend.length === 0) {
        notificationsToSend.push('嘿，您的 LifeCanvas 守护提醒准时送达！今天一切安好，继续加油 💪');
      }

      // 3. 执行推送（必达）
      const payload = JSON.stringify({
        title: 'LifeCanvas 守护提醒',
        body: notificationsToSend.join('\n'),
      });

      const pushSubsArray = Array.isArray(pushSub) ? pushSub : [pushSub];
      let userSuccessCount = 0;
      let expiredEndpoints = new Set<string>();

      for (const sub of pushSubsArray) {
        if (!sub?.endpoint) continue;
        try {
          await webpush.sendNotification(sub as webpush.PushSubscription, payload);
          userSuccessCount++;
          pushedCount++;
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            expiredEndpoints.add(sub.endpoint);
          } else {
            console.error(`Push failed for user ${userId} endpoint ${sub.endpoint}:`, error);
          }
        }
      }

      // 清理过期凭据并保存有效凭据
      if (expiredEndpoints.size > 0) {
        const validSubs = pushSubsArray.filter((sub: any) => !expiredEndpoints.has(sub.endpoint));
        if (validSubs.length === 0) {
          await supabase.from('user_state').delete().eq('user_id', userId).eq('key', 'pushSub');
        } else {
          await supabase.from('user_state').upsert(
            { user_id: userId, key: 'pushSub', value: validSubs },
            { onConflict: 'user_id,key' }
          );
        }
      }
    }

    return NextResponse.json({ success: true, pushedCount });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
