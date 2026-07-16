import { createClient } from '@supabase/supabase-js';

// Read env from .env.local
const fs = await import('fs');
const path = await import('path');

const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const env = {};
for (const line of envFile.split('\n')) {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim();
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Clear all push subscriptions so devices re-register fresh
const { error } = await supabase
  .from('user_state')
  .delete()
  .eq('user_id', 'demo_user_001')
  .eq('key', 'pushSub');

if (error) {
  console.error('清空失败:', error);
} else {
  console.log('✅ 数据库中的旧推送订阅已全部清空！');
  console.log('请在手机和电脑上各刷新一次页面，让它们重新注册。');
}
