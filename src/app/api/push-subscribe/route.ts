import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const USER_ID = 'demo_user_001';

export async function POST(request: Request) {
  try {
    const subscription = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_state')
      .upsert(
        { user_id: USER_ID, key: 'pushSub', value: subscription },
        { onConflict: 'user_id,key' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Subscription saved to Supabase' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
