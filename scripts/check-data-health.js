/**
 * 比赛数据健康检查脚本
 *
 * 检查项目：
 * 1. 报名截止日期已过但状态仍为"报名中"的比赛
 * 2. 日期结束但未标记"已结束"的比赛
 * 3. 描述含大陆限制但eligibility未标记的比赛
 * 4. 标题/主办方含大学关键词但target_universities缺失的比赛
 * 5. 无结束日期且无报名截止日期的比赛（可能数据缺失）
 *
 * 使用方式：
 *   node scripts/check-data-health.js
 * 自动修复：
 *   node scripts/check-data-health.js --fix
 */

const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL } = process.env;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('错误: 请设置环境变量 SUPABASE_SERVICE_ROLE_KEY');
  console.error('用法: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/check-data-health.js');
  process.exit(1);
}
const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL || 'https://kjqcnxrebdrnmhtwyyhw.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY
);

const HK_UNIS = [
  {slug:'hku',kw:['hku','港大','香港大學','香港大学','university of hong kong']},
  {slug:'cuhk',kw:['cuhk','港中大','香港中文大學','香港中文大学','chinese university']},
  {slug:'hkust',kw:['hkust','港科大','香港科技大學','香港科技大学']},
  {slug:'cityu',kw:['cityu','城大','香港城市大學','香港城市大学','city university of hong kong']},
  {slug:'polyu',kw:['polyu','理大','香港理工大學','香港理工大学','polytechnic']},
  {slug:'hkbu',kw:['hkbu','浸大','香港浸會大學','香港浸会大学','baptist']},
  {slug:'lingnan',kw:['lingnan','嶺南','岭南大学','嶺南大學']},
  {slug:'eduhk',kw:['eduhk','教大','香港教育大學','香港教育大学','education university']},
  {slug:'hsuhk',kw:['hsuhk','恒生','香港恒生大學','香港恒生大学','hang seng']},
  {slug:'hkmu',kw:['hkmu','都大','香港都會大學','香港都会大学','metropolitan','ouhk']},
];

const MAINLAND_KW = ['大陆','内地','国内高校','中国公民','中国籍','全国高校','全国大学生',
  '國家教育部','中国内地','境内高校','中國內地','中國公民','全国大学生','全國大學生'];

function matchHKUni(title, organizer) {
  const text = ((title||'') + ' ' + (organizer||'')).toLowerCase();
  return HK_UNIS.filter(u => u.kw.some(k => text.includes(k))).map(u => u.slug);
}

function isMainlandOnly(title, description, eligibility) {
  const text = (description||'') + ' ' + (eligibility||'');
  const hasMainlandKW = MAINLAND_KW.some(k => text.includes(k));
  if (!hasMainlandKW) return false;
  // 排除香港本地的比赛（例如\"面向香港、台湾、澳门、大陆\"这种）
  const hkKW = ['香港','Hong Kong','HK','九龍','新界','港岛'];
  const hasHK = hkKW.some(k => (title||'').includes(k) || (description||'').includes(k));
  if (hasHK && !text.includes('全国大学生') && !text.includes('全国高校')) return false;
  return true;
}

async function check(options = { fix: false }) {
  const { data: all } = await supabase.from('competitions').select('*').limit(500);
  const now = new Date();
  const issues = { expired: [], mainland: [], uniMissing: [], noDates: [], fixed: [] };

  for (const c of all) {
    // 1. 过期检查
    const deadlinePassed = c.registration_deadline && new Date(c.registration_deadline) < now;
    const dateEndPassed = c.date_end && new Date(c.date_end) < now;
    if ((deadlinePassed || dateEndPassed) && c.status !== '已结束') {
      const reason = deadlinePassed ? `deadline=${c.registration_deadline.slice(0,10)}` : `end=${c.date_end.slice(0,10)}`;
      issues.expired.push({ ...c, reason });
      if (options.fix) {
        await supabase.from('competitions').update({ status: '已结束' }).eq('id', c.id);
        issues.fixed.push(`✅ 已结束: ${c.title.slice(0,50)} (${reason})`);
      }
    }

    // 2. 大陆限制检查
    if (isMainlandOnly(c.title, c.description, c.eligibility) && !(c.description||'').includes('仅限中国内地院校')) {
      issues.mainland.push(c);
      if (options.fix) {
        await supabase.from('competitions').update({
          eligibility: '学校提名',
          description: '【⚠️ 仅限中国内地院校学生参加，香港学生无法报名】',
        }).eq('id', c.id);
        issues.fixed.push(`🔴 大陆限制: ${c.title.slice(0,50)}`);
      }
    }

    // 3. 大学关联缺失
    const matched = matchHKUni(c.title, c.organizer);
    const hasTarget = c.target_universities && Array.isArray(c.target_universities) && c.target_universities.length > 0;
    if (matched.length > 0 && !hasTarget) {
      issues.uniMissing.push({ ...c, matchedUnis: matched });
      if (options.fix) {
        await supabase.from('competitions').update({ target_universities: matched.map(s=>s.toUpperCase()) }).eq('id', c.id);
        issues.fixed.push(`🟢 大学关联: ${c.title.slice(0,50)} → ${matched.map(s=>s.toUpperCase())}`);
      }
    }

    // 4. 缺少日期
    if (!c.date_end && !c.registration_deadline) {
      issues.noDates.push(c);
    }
  }

  // 报告
  console.log('═══════════════════════════════════════');
  console.log('  HK Compass 数据健康检查');
  console.log('  时间:', new Date().toISOString());
  console.log('═══════════════════════════════════════\n');

  console.log(`总比赛数: ${all.length}`);
  console.log(`已结束(status): ${all.filter(c=>c.status==='已结束').length}`);
  console.log(`报名中: ${all.filter(c=>c.status==='报名中').length}`);

  console.log(`\n🔴 过期未标记: ${issues.expired.length} 条`);
  issues.expired.forEach(c => console.log(`  - [${c.status}] ${c.title.slice(0,50)} | ${c.reason}`));

  console.log(`\n🟠 大陆限制未标记: ${issues.mainland.length} 条`);
  issues.mainland.forEach(c => console.log(`  - ${c.title.slice(0,50)}`));

  console.log(`\n🟡 大学关联缺失: ${issues.uniMissing.length} 条`);
  issues.uniMissing.forEach(c => console.log(`  - ${c.title.slice(0,50)} → 应关联: ${c.matchedUnis}`));

  console.log(`\n⚪ 无日期数据: ${issues.noDates.length} 条`);
  if (issues.noDates.length > 10) {
    console.log(`  (${issues.noDates.length} 条，前10条:)`);
    issues.noDates.slice(0,10).forEach(c => console.log(`  - ${c.title.slice(0,50)}`));
  } else {
    issues.noDates.forEach(c => console.log(`  - ${c.title.slice(0,50)}`));
  }

  if (options.fix && issues.fixed.length > 0) {
    console.log(`\n✅ 已修复 ${issues.fixed.length} 条:`);
    issues.fixed.forEach(f => console.log(`  ${f}`));
  }

  const totalIssues = issues.expired.length + issues.mainland.length + issues.uniMissing.length;
  console.log(`\n总问题数: ${totalIssues} | 可用 --fix 自动修复`);
}

const args = process.argv.slice(2);
const opts = { fix: args.includes('--fix') };
check(opts).catch(e => { console.error('检查失败:', e.message); process.exit(1); });
