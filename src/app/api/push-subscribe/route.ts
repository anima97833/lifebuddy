import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// 模拟的用户ID，与之前的保持一致
const USER_ID = 'demo_user_001';

export async function POST(request: Request) {
  try {
    const subscription = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // 存入 Vercel KV 数据库
    await kv.set(`user:${USER_ID}:pushSub`, subscription);
    
    // 顺手将当前用户加入待遍历列表（Cron 定时任务需要用到）
    await kv.sadd('users', USER_ID);

    return NextResponse.json({ success: true, message: 'Subscription saved to KV' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
