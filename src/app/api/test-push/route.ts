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

    const pushSub = data.value as webpush.PushSubscription;

    await webpush.sendNotification(
      pushSub,
      JSON.stringify({
        title: '🎉 测试成功！',
        body: '推送链路完全通畅，您的 LifeCanvas 守护提醒已就位！',
      })
    );

    return NextResponse.json({ success: true, message: '测试通知已发出！' });
  } catch (err: any) {
    // 凭证过期时自动清理
    if (err.statusCode === 410 || err.statusCode === 404) {
      await supabase
        .from('user_state')
        .delete()
        .eq('user_id', 'demo_user_001')
        .eq('key', 'pushSub');
      return NextResponse.json(
        { success: false, error: '推送凭证已过期，请重新在网页上开启推送授权后再试。' },
        { status: 410 }
      );
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
