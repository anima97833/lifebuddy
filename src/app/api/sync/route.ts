import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// NOTE: 实际项目中应当通过 Next-Auth 或类似机制获取真实 userId
// 这里为了演示平滑重构，暂定一个模拟的用户ID
const USER_ID = 'demo_user_001'; 

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 });
  }

  try {
    const data = await kv.get(`user:${USER_ID}:${key}`);
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    // 将数据存入 KV，确保该用户的键名不会相互冲突
    // 对于高频同步，Vercel KV 的性能完全足以支撑
    await kv.set(`user:${USER_ID}:${key}`, value);
    
    // 如果是首次写入该用户的数据，可以顺便把 userId 加入用户集合中，供 Cron 任务遍历
    await kv.sadd('users', USER_ID);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
