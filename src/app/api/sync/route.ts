import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 模拟的用户ID
const USER_ID = 'demo_user_001';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('user_state')
      .select('value')
      .eq('user_id', USER_ID)
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine (we just return empty data)
      throw error;
    }

    return NextResponse.json({ data: data ? data.value : null });
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

    const { error } = await supabase
      .from('user_state')
      .upsert(
        { user_id: USER_ID, key, value },
        { onConflict: 'user_id,key' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
