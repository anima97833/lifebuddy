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

      // 并发查询该用户的 habits 和 subscriptions
      const { data: userStates, error: stateError } = await supabase
        .from('user_state')
        .select('key, value')
        .eq('user_id', userId)
        .in('key', ['subscriptions', 'rituals']);

      if (stateError) continue;

      let subscriptions: any[] = [];
      let rituals: any[] = [];

      userStates.forEach(row => {
        if (row.key === 'subscriptions') subscriptions = row.value || [];
        if (row.key === 'rituals') rituals = row.value || [];
      });

      const notificationsToSend: string[] = [];
      const now = new Date();
      now.setHours(0, 0, 0, 0);

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
          if (!lastCheckIn || lastCheckIn.toDateString() !== new Date().toDateString()) {
            uncompletedRituals++;
          }
        });
        if (uncompletedRituals > 0 && new Date().getHours() >= 20) {
          notificationsToSend.push(`您今天还有 ${uncompletedRituals} 个习惯未打卡，记得完成哦。`);
        }
      }

      // 3. 执行推送
      if (notificationsToSend.length > 0) {
        const payload = JSON.stringify({
          title: 'LifeCanvas 守护预警',
          body: notificationsToSend.join('\n'),
        });

        try {
          await webpush.sendNotification(pushSub as webpush.PushSubscription, payload);
          pushedCount++;
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase.from('user_state').delete().eq('user_id', userId).eq('key', 'pushSub');
          } else {
            console.error(`Push failed for user ${userId}:`, error);
          }
        }
      }
    }

    return NextResponse.json({ success: true, pushedCount });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
