import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { kv } from '@vercel/kv';

// 配置 VAPID 密钥，必须与前端公钥匹配
webpush.setVapidDetails(
  'mailto:support@lifecanvas.example.com', // 替换为真实的维护邮箱
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

// 强制 Vercel 进行无缓存的动态处理
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 安全校验：Vercel Cron 会携带特定的 Bearer Token
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 假设所有的 userId 保存在一个集合中
    const userIds = await kv.smembers('users');

    let pushedCount = 0;

    for (const userId of userIds) {
      // 提取用户的订阅配置、数据与 PushSubscription
      const [pushSub, subscriptions, rituals] = await Promise.all([
        kv.get(`user:${userId}:pushSub`),
        kv.get(`user:${userId}:subscriptions`),
        kv.get(`user:${userId}:rituals`),
      ]);

      if (!pushSub) continue;

      const notificationsToSend: string[] = [];
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // 1. 检查订阅是否即将过期 (3天内)
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

      // 2. 检查习惯 (Rituals) 每日打卡状态
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
            // 订阅已失效或退订，清理 KV
            await kv.del(`user:${userId}:pushSub`);
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
