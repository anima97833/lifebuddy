import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabase } from '@/lib/supabase';

webpush.setVapidDetails(
  'mailto:support@lifecanvas.example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // 从数据库读取推送凭证
    const { data, error } = await supabase
      .from('user_state')
      .select('value')
      .eq('user_id', 'demo_user_001')
      .eq('key', 'pushSub')
      .single();

    if (error || !data?.value) {
      return NextResponse.json(
        { success: false, error: '未找到推送订阅，请先在网页上开启推送授权。' },
        { status: 404 }
      );
    }

    const pushSubs = Array.isArray(data.value) ? data.value : [data.value];
    let successCount = 0;
    let expiredEndpoints = new Set<string>();

    const payload = JSON.stringify({
      title: '🎉 测试成功！',
      body: '推送链路完全通畅，您的 LifeCanvas 守护提醒已就位！',
    });

    for (const pushSub of pushSubs) {
      if (!pushSub?.endpoint) continue;
      try {
        await webpush.sendNotification(pushSub as webpush.PushSubscription, payload);
        successCount++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredEndpoints.add(pushSub.endpoint);
        } else {
          console.error('Test push failed for endpoint:', pushSub.endpoint, err);
        }
      }
    }

    // 清理过期凭据
    if (expiredEndpoints.size > 0) {
      const validSubs = pushSubs.filter((sub: any) => !expiredEndpoints.has(sub.endpoint));
      if (validSubs.length === 0) {
        await supabase.from('user_state').delete().eq('user_id', 'demo_user_001').eq('key', 'pushSub');
      } else {
        await supabase.from('user_state').upsert(
          { user_id: 'demo_user_001', key: 'pushSub', value: validSubs },
          { onConflict: 'user_id,key' }
        );
      }
    }

    if (successCount === 0) {
      return NextResponse.json(
        { success: false, error: '所有凭据均已过期，请重新开启推送授权。' },
        { status: 410 }
      );
    }

    return NextResponse.json({ success: true, message: `测试通知已向 ${successCount} 个设备发出！` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
