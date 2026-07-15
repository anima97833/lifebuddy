import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const USER_ID = 'demo_user_001';

export async function POST(request: Request) {
  try {
    const subscription = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // 先读取现有的订阅
    const { data: existingData } = await supabase
      .from('user_state')
      .select('value')
      .eq('user_id', USER_ID)
      .eq('key', 'pushSub')
      .single();

    let pushSubs = [];
    if (existingData?.value) {
      // 兼容旧版的单对象结构，转换为数组
      if (!Array.isArray(existingData.value)) {
        pushSubs = [existingData.value];
      } else {
        pushSubs = existingData.value;
      }
    }

    // 检查是否已经存在该 endpoint
    const exists = pushSubs.some((sub: any) => sub.endpoint === subscription.endpoint);
    
    if (!exists) {
      pushSubs.push(subscription);
      
      const { error } = await supabase
        .from('user_state')
        .upsert(
          { user_id: USER_ID, key: 'pushSub', value: pushSubs },
          { onConflict: 'user_id,key' }
        );

      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'Subscription saved to Supabase' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
