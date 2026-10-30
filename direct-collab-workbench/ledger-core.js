'use strict';
const fail=m=>{throw new Error(m)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Lexical checks shared with the CLI; filesystem checks remain CLI-only.
function safeRelativePath(value) {
  return typeof value==='string' && !!value.trim() && !value.startsWith('/') && !value.includes('\\') && !value.includes(':') && !value.split('/').some(s=>!s || s==='.' || s==='..') && value.split('/')[0].replace(/[. ]+$/g,'').toLowerCase()!=='.collab';
}
// Replay has no filesystem access: detect path aliases, not hard links.
function evidenceKey(value) {
  // Unknown browser platforms fail closed for Windows case aliases.
  const platform=typeof process!=='undefined' && process.platform ? process.platform : (typeof navigator!=='undefined' ? navigator.platform : '');
  const windows=!platform || /^(win32|win)/i.test(platform);
  const parts=[];
  for(const part of value.replace(/\\/g,'/').split('/')) {
    if(!part || part==='.') continue;
    if(part==='..') parts.pop(); else parts.push(windows ? part.replace(/[. ]+$/g,'').toLowerCase() : part);
  }
  return parts.join('/');
}
function coverage(t) { if(!t.review) return 'none'; if(!('coveredPaths' in t.review)) return 'legacy-unknown'; return t.review.coveredPaths.length===t.paths.length ? 'full' : 'partial'; }
function validCoverage(t) { const r=t.review; return !r || !('coveredPaths' in r) || (Array.isArray(r.coveredPaths) && r.coveredPaths.length>0 && new Set(r.coveredPaths).size===r.coveredPaths.length && r.coveredPaths.every(p=>t.paths.includes(p)) && same(r.snapshot,t.hashes)); }

function deriveGates(t) {
  const history=Array.isArray(t.gateHistory) ? t.gateHistory : []
  const has=cmd=>history.includes(cmd)
  const gate=(name,label,detail,tone='waiting')=>({name,label,detail,tone})
  const present=x=>typeof x==='string' && !!x.trim()
  const scoped=Array.isArray(t.paths) && t.paths.length>0 && t.paths.every(present) && new Set(t.paths).size===t.paths.length
  const interfaces=Array.isArray(t.interfaces) && t.interfaces.length>0 && t.interfaces.every(present)
  const first=present(t.goal) && present(t.acceptance)
  const assigned=present(t.owner) && interfaces && scoped
  const cancel=history.lastIndexOf('cancel')
  const started=has('start') && history.lastIndexOf('start')>cancel
  const lastSubmit=history.lastIndexOf('submit'), lastRework=history.lastIndexOf('rework')
  const submitted=lastSubmit>=0 && lastSubmit>lastRework && lastSubmit>cancel && started && history.lastIndexOf('start')<lastSubmit
  const records=Array.isArray(t.gateRecords)?t.gateRecords:[]
  const lastReview=history.lastIndexOf('review')
  const r=t.review, rec=records[lastReview], submit=records[lastSubmit]
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
  const validDate=x=>typeof x==='string' && Number.isFinite(Date.parse(x))
  const currentReview=!!(r && submitted && lastReview>lastSubmit && rec && validDate(rec.at) && validDate(r.at) && rec.task && rec.task.status==='review' && same(rec.task.review,r) && same(rec.task.hashes,t.hashes) && submit?.coverageGate===1 && submit.task?.status==='review' && same(submit.task.hashes,t.hashes) && r.snapshot && same(r.snapshot,t.hashes) && present(r.reviewer) && r.reviewer!==t.owner && present(r.evidence) && /^[a-f0-9]{64}$/i.test(r.evidenceHash || ''))
  let work=t.status==='blocked' ? ['受阻','阻塞是账本登记，实际进程状态未知。','problem']
    : t.status==='cancelled' ? ['已取消','取消是账本登记，不代表进程已退出。','waiting']
    : t.status==='draft' && started ? ['状态与启动历史矛盾','账本记录相互矛盾，施工状态未知。','unknown']
    : t.status==='draft' ? ['未开始','尚未登记启动。','waiting']
    : t.status==='active' && (!started || lastSubmit>lastRework) ? ['施工记录未知','启动或当前轮次历史不足或矛盾。','unknown']
    : t.status==='active' ? ['登记进行中','账本状态不证明进程正在运行。','active']
    : submitted ? ['已登记送审','送审记录不证明进程已退出。','registered']
    : ['送审记录未知','缺少当前送审历史，无法确认。','unknown']
  let review=['待审','未登记审查；未核验证据和新鲜度。','waiting']
  if (t.review) review=['旧审查或当前轮次未知','存在审查登记，但当前适用性未知；未核验证据和新鲜度。','unknown']
  if (t.review && !['active','draft','cancelled'].includes(t.status)) {
    if (cancel>=lastSubmit && cancel>=0) review=['审查历史矛盾','存在取消记录；审查归属未知，未核验。','unknown']
    else if (t.coverage==='部分（登记声明）' && t.review.result==='pass') review=['范围不足','部分范围为登记声明；当前轮次及证据未核验。','problem']
    else if (!currentReview) review=['审查轮次或证据未知','历史快照、当前轮次或必要字段不足；未核验证据和新鲜度。','unknown']
    else if (t.review.result==='fail') review=['登记未通过','审查结论为登记声明；未核验证据或新鲜度。','problem']
    else if (t.review.result!=='pass') review=['结论未知','审查结论未知；未核验证据或新鲜度。','unknown']
    else if (t.coverage==='部分（登记声明）') review=['范围不足','部分范围为登记声明；未核验证据或新鲜度。','problem']
    else if (t.coverage==='完整（登记声明）' && submitted && has('review') && history.lastIndexOf('review')>lastSubmit) review=['登记通过','完整范围与通过均为登记声明；未核验真实性、证据或新鲜度。','registered']
    else review=['审查范围或历史未知','旧审查或历史不足；未核验证据或新鲜度。','unknown']
  }
  return [
    gate('立项',first?'已登记':'待补充',first?'目标和验收已登记；安全清单待人工核对。':'目标或验收缺失，安全清单待人工核对。',first?'registered':'unknown'),
    gate('派工',!assigned?'待补充':started && t.status==='draft'?'启动未知（记录矛盾）':started?'已登记启动':t.status==='draft'?'待启动':'启动记录未知', '负责人、接口及文件边界仅为登记；启动记录不证明真实 CLI 进程。',!assigned || (started && t.status==='draft')?'unknown':started?'registered':t.status==='draft'?'waiting':'unknown'),
    gate('施工',...work),gate('审片',...review),
    gate('交片',t.status==='accepted' && t.coverage==='部分（登记声明）'?'验收矛盾（范围不足）':t.status==='accepted'?'已登记验收':t.status==='cancelled'?'已取消':'未验收',t.status==='accepted'?'账本登记验收；历史完整性及证据、文件、新鲜度未核验。':'账本状态仅为登记；未核验验收证据、文件或新鲜度。',t.status==='accepted'?'unknown':'waiting')
  ]
}

function validateAndProject(s) {
  const str=v=>typeof v==='string' && !!v.trim();
  const date=v=>str(v) && Number.isFinite(Date.parse(v));
  const list=v=>Array.isArray(v) && v.length>0 && v.every(str);
  const validTask=t=>t && typeof t==='object' && str(t.id) && /^[\w-]+$/.test(t.id) && str(t.goal) && str(t.owner) && list(t.paths) && list(t.interfaces) && str(t.acceptance) && Number.isFinite(t.budgetMinutes) && t.budgetMinutes>0 && ['draft','active','review','accepted','blocked','cancelled'].includes(t.status) && (t.status!=='blocked' || (['draft','active','review'].includes(t.previousStatus) && str(t.blockReason))) && (!t.progress || (str(t.progress.evidence) && str(t.progress.next) && str(t.progress.at))) && (!t.review || (str(t.review.reviewer) && ['pass','fail'].includes(t.review.result) && str(t.review.evidence) && /^[a-f0-9]{64}$/.test(t.review.evidenceHash) && str(t.review.at))) && (!t.verification || (str(t.verification.evidence) && /^[a-f0-9]{64}$/.test(t.verification.hash))) && (!['review','accepted'].includes(t.status) || (t.hashes && typeof t.hashes==='object' && t.paths.every(p=>/^[a-f0-9]{64}$/.test(t.hashes[p])))) && (t.status!=='accepted' || (t.review?.result==='pass' && t.verification));
  const consistent=t=>validTask(t) && new Set(t.paths).size===t.paths.length && validCoverage(t) && (!t.startedAt || date(t.startedAt)) && (!['active','review','accepted'].includes(t.status) || date(t.startedAt)) && (!t.review || (t.review.reviewer!==t.owner && date(t.review.at))) && (!t.progress || date(t.progress.at)) && (!t.process || (Number.isSafeInteger(t.process.pid) && t.process.pid>0 && str(t.process.session) && (t.process.exitCode===null || Number.isSafeInteger(t.process.exitCode)) && date(t.process.at)));
  if (!s || s.version!==1 || !Array.isArray(s.tasks) || !Array.isArray(s.history) || s.tasks.some(t=>!consistent(t)) || new Set(s.tasks.map(t=>t.id)).size!==s.tasks.length || s.history.some(h=>!h || !date(h.at) || !str(h.command) || !str(h.id) || !consistent(h.task))) fail('状态格式损坏');
  // Replay per-task snapshots: transitions and unchanged fields must agree.
  const latest=new Map(), submitGates=new Map();
  const rules={start:[['draft'],'active',['status','startedAt']],process:[['active','blocked','review'],null,['process']],progress:[['active'],null,['progress']],block:[['draft','active','review'],'blocked',['status','previousStatus','blockReason']],resume:[['blocked'],null,['status','previousStatus','blockReason']],submit:[['active','review'],'review',['status','hashes','review']],review:[['review'],null,['review']],rework:[['review'],'active',['status','review']],accept:[['review'],'accepted',['status','verification']],cancel:[['draft','active','review','blocked'],'cancelled',['status','cancelReason']]};
  for(const h of s.history) {
    if(h.id!==h.task.id) fail('状态历史不一致');
    const prev=latest.get(h.id);
    if(!prev) {
      if(h.command!=='create' || h.task.status!=='draft' || Object.keys(h.task).some(k=>!['id','goal','owner','paths','interfaces','acceptance','budgetMinutes','status'].includes(k))) fail('状态历史不一致');
    } else {
      const rule=rules[h.command];
      if(!rule || !rule[0].includes(prev.status) || h.task.status!==(h.command==='resume'?prev.previousStatus:(rule[1] || prev.status))) fail('状态历史不一致');
      if(h.command==='block' && h.task.previousStatus!==prev.status) fail('状态历史不一致');
      if(h.command==='resume' && ('previousStatus' in h.task || 'blockReason' in h.task)) fail('状态历史不一致');
      if(h.command==='submit' && h.task.review) fail('状态历史不一致');
      if(h.command==='rework' && (h.task.review || !str(h.reason))) fail('状态历史不一致');
      if(h.command==='cancel' && !str(h.task.cancelReason)) fail('状态历史不一致');
      if(['process','progress','review'].includes(h.command) && !h.task[h.command]) fail('状态历史不一致');
      if(h.command==='accept' && submitGates.get(h.id)===1 && coverage(prev)!=='full') fail('状态历史不一致');
      if(h.command==='review' && submitGates.get(h.id)===1 && !safeRelativePath(h.task.review.evidence)) fail('状态历史不一致：审查证据路径无效');
      if(h.command==='accept' && submitGates.get(h.id)===1 && (!safeRelativePath(prev.review.evidence) || !safeRelativePath(h.task.verification.evidence))) fail('状态历史不一致：证据路径无效');
      if(h.command==='accept' && submitGates.get(h.id)===1 && evidenceKey(prev.review.evidence)===evidenceKey(h.task.verification.evidence)) fail('状态历史不一致：审查与验收证据路径相同');
      if(h.command==='accept' && prev.review?.result!=='pass') fail('状态历史不一致');
      if(h.command==='accept' && coverage(prev)==='partial') fail('状态历史不一致');
      if(h.command==='accept' && coverage(prev)==='full' && submitGates.get(h.id)!==1) fail('状态历史不一致');
      for(const k of new Set([...Object.keys(prev),...Object.keys(h.task)])) if(!rule[2].includes(k) && !same(prev[k],h.task[k])) fail('状态历史不一致');
    }
    if(h.command==='submit') submitGates.set(h.id,h.coverageGate);
    latest.set(h.id,h.task);
  }
  if(latest.size!==s.tasks.length || s.tasks.some(t=>!latest.has(t.id) || !same(t,latest.get(t.id)))) fail('状态历史不一致');

 const recordsById=new Map();
 for(const h of s.history) {
   if(!recordsById.has(h.id)) recordsById.set(h.id,[]);
   recordsById.get(h.id).push(h);
 }
 const tasks=s.tasks.map(t=>{const records=recordsById.get(t.id); const c=coverage(t); const v={...t,coverage:c==='legacy-unknown'?'旧审查范围未知':c==='full'?'完整（登记声明）':c==='partial'?'部分（登记声明）':'未记录',gateHistory:records.map(h=>h.command),gateRecords:records};return {...t,coverage:c,gates:deriveGates(v)};});
 return {tasks,history:s.history.slice(-5)};
}
module.exports={validateAndProject,safeRelativePath};
