const fs = require('fs');
async function test() {
  const r = await fetch('http://localhost:3000/api/sync');
  const res = await r.json();
  const userData = res.data;
  
  const bot = { name: '新机器人', age: '', gender: '', speakingStyle: '', personality: '' };
  
  let userContext = '';
  if (userData && Object.keys(userData).length > 0) {
    const lines = [];

    if (userData.rituals) {
      const r = userData.rituals;
      lines.push(`【日常仪式】共 ${r.length} 个：${r.map(x => `${x.name}（目标${x.totalDays}天，已打卡${(x.checkedDates||[]).length}天）`).join('、')}`);
    }
    if (userData.subscriptions) {
      const s = userData.subscriptions;
      lines.push(`【订阅守卫】共 ${s.length} 项：${s.map(x => `${x.name} ${x.amount}元/${x.cycle}${x.expiry ? '（到期' + x.expiry + '）' : ''}`).join('、')}`);
    }
    if (userData.summaryProjects) {
      const p = userData.summaryProjects;
      lines.push(`【成长/待办】共 ${p.length} 个项目：${p.map(x => {
        const done = (x.tasks||[]).filter(t => t.done).length;
        return `${x.title}（${done}/${(x.tasks||[]).length} 完成）`;
      }).join('、')}`);
    }
    if (userData.skills) {
      const sk = userData.skills;
      lines.push(`【技能】${sk.map(x => `${x.name}${x.level ? '(Lv' + x.level + ')' : ''}`).join('、')}`);
    }
    if (userData.jobs) {
      const j = userData.jobs;
      lines.push(`【求职记录】共 ${j.length} 条：${j.map(x => `${x.company} - ${x.position}（${x.status||'进行中'}）`).join('、')}`);
    }
    if (userData.collectionNodes) {
      const c = userData.collectionNodes;
      lines.push(`【收藏分布】${c.map(x => `${x.name}（${(x.items||[]).length}项，合计¥${(x.items||[]).reduce((s,i)=>s+Number(i.price||0),0).toFixed(2)}）`).join('、')}`);
    }

    if (lines.length > 0) {
      userContext = `\n\n【用户的个人生活数据（仅供参考背景，不要主动输出所有内容）】：\n${lines.join('\n')}\n\n【数据使用规则 — 必须严格遵守】：\n- 用户问哪个模块，你就只引用那个模块的数据来回答，绝对不要把不相关的其他模块数据混入回复中。\n- 例如：用户问"收藏分布"→ 只看【收藏分布】数据；用户问"订阅"→ 只看【订阅守卫】数据；用户问"仪式"→ 只看【日常仪式】数据。\n- 如果用户没有询问数据相关内容，正常聊天即可，不要主动提及以上任何数据。`;
    }
  }

  const prompt = `你是一个叫做「${bot.name}」的AI助手。${bot.age ? `你的年龄设定是 ${bot.age} 岁。` : ''}${bot.gender ? `性别：${bot.gender}。` : ''}${bot.speakingStyle ? `你的说话方式是：${bot.speakingStyle}。` : ''}${bot.personality ? `人物设定：${bot.personality}。` : ''}${userContext}

【回复格式指令 — 必须严格遵守】：
1. 每次回复必须拆分为至少 3 条独立的简短消息（模仿真人发微信的习惯，不要一次发一大段）。
2. 每条消息之间使用 \`|||\` 作为分隔符，且分隔符两侧不要有多余的空格或换行。
例如：好的呀，等我一下哈|||我查到了！|||大概需要三百多块钱。
请严格遵守以上所有指令。`;

  console.log(prompt);
}
test();
