import { host, useValue, Button } from '@hermes/plugin-sdk'
import { useEffect, useMemo, useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'

// Best-effort masking, not a guarantee: keep the useful surrounding text.
const text = x => {
 if(typeof x!=='string') return '未记录';
 const masked=x.replace(/\b(Bearer\s+)[^\s,;]+/gi,'$1[已隐藏]')
  .replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|passwd|secret|authorization)\b(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,'$1$2[已隐藏]')
  .replace(/\b(?:sk|ghp|github_pat|xoxb|xoxp)-[A-Za-z0-9_-]{8,}\b/gi,'[已隐藏]');
 return masked.length>500 ? masked.slice(0,500)+'…（已截断）' : masked;
}
// BEGIN GENERATED LEDGER CORE
const ledgerCore=(()=>{const module={exports:{}};
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

return module.exports;})();
// END GENERATED LEDGER CORE
export function parseState(raw) {
 const s=JSON.parse(raw);
 const result=ledgerCore.validateAndProject(s);
 const byId=new Map(result.tasks.map(t=>[t.id,[]]));
 for(const h of s.history) byId.get(h.id).push(h);
 return {...result,tasks:result.tasks.map(t=>{const history=byId.get(t.id),rounds=[]; for(const h of history){if(!rounds.length || h.command==='rework' || (h.command==='submit' && rounds.at(-1).events.some(e=>e.command==='submit'))) rounds.push({events:[]}); rounds.at(-1).events.push(h)} return {...t,history,rounds,coverage:({none:'未记录','legacy-unknown':'旧审查范围未知',partial:'部分（登记声明）',full:'完整（登记声明）'})[t.coverage]}})};
}
export function deriveGates(t) { return t.gates; }
export function createController(files, publish) {
  let token=0, folder=null, filter='all', current={data:null,message:'请选择项目文件夹',updated:null}
  const emit=(data,message,updated=null)=>{current={data,message,updated};publish({folder,...current,filter})}
  async function refresh() {
    const n=++token, selected=folder
    if (!selected) { emit(null,'请选择项目文件夹'); return }
    emit(null,'正在读取…')
    try {
      if (typeof files?.readText !== 'function') {emit(null,'当前 Desktop 不支持文件读取'); return}
      const r=await files.readText(selected.id,'.collab/state.json')
      if (n!==token) return
      if (!r?.ok) {
        const errors={'not-found':'未找到工作台状态文件','not-granted':'当前无文件夹授权，请重新授权','folder-missing':'项目文件夹不存在','folder-changed':'项目文件夹已更换，请重新授权','too-large':'状态文件超过 4 MiB','unavailable':'当前 Desktop 不支持文件读取'}
        if (r?.error==='not-granted' || r?.error==='folder-changed') {folder=null;filter='all'}
        emit(null,errors[r?.error] || '读取失败：无权限、文件不安全或设备不可用'); return
      }
      let parsed
      try {parsed=JSON.parse(r.text)} catch {emit(null,'状态文件 JSON 损坏');return}
      if (parsed && typeof parsed==='object' && Number.isInteger(parsed.version) && parsed.version!==1) {emit(null,'状态文件版本不支持');return}
      let data
      try {data=parseState(r.text)} catch {emit(null,'状态格式或历史损坏');return}
      emit(data,'读取成功',new Date().toLocaleString())
    } catch(e) { if(n===token) emit(null, '读取失败：文件访问不可用') }
  }
  return {select(f){if(folder?.id!==f?.id) filter='all';folder=f; return refresh()},refresh,setFilter(value){filter=value;publish({folder,...current,filter})},clear(){++token;folder=null;filter='all';emit(null,'请选择项目文件夹')},async pick(){
    const n=++token, previous=folder; folder=null; emit(null,'请选择项目文件夹')
    if (typeof files?.requestFolder !== 'function') {emit(null,'当前 Desktop 不支持文件夹授权');return}
    try { const r=await files.requestFolder(); if(n!==token) return; if(r?.ok && r.folder){if(previous?.id!==r.folder.id) filter='all';folder=r.folder;await refresh()} else {filter='all';emit(null,'未选择或未获授权')} }
    catch {if(n===token) emit(null,'文件夹授权不可用')}
  }}
}
function Pane({ctx}) {
  const cwd=useValue(host.state.cwd)
  const [view,setView]=useState({folder:null,data:null,message:'请选择项目文件夹',updated:null})
  const controller=useMemo(()=>createController(ctx.files,setView),[ctx])
  const [boundCwd,setBoundCwd]=useState(cwd)

  useEffect(()=>{ controller.clear(); setBoundCwd(cwd) },[cwd,controller])
  useEffect(()=>()=>controller.clear(),[controller])
  const pick=()=>controller.pick()
  const shown=boundCwd===cwd ? view : {folder:null,data:null,message:'项目已切换，请重新选择文件夹'}
  const filter=shown.filter || 'all'
  const row=(label,value)=>jsx('div',{className:'break-words [overflow-wrap:anywhere]',children:[label,'：',text(value && String(value).trim() ? value : '未登记')]})
  const events={create:'立项',start:'启动',process:'进程登记',progress:'进展登记',block:'受阻',resume:'恢复',submit:'送审',review:'审查',rework:'返修',accept:'验收',cancel:'取消'}
  const cards=shown.data?.tasks || []
  const counts=Object.fromEntries(['draft','active','review','blocked','accepted','cancelled'].map(k=>[k,0]))
  for(const t of cards) if(Object.hasOwn(counts,t.status)) counts[t.status]++
  const visible=cards.filter(t=>filter==='all'||t.status===filter).slice().sort((a,b)=>({blocked:0,active:1,review:2,draft:3,cancelled:4,accepted:5}[a.status]-{blocked:0,active:1,review:2,draft:3,cancelled:4,accepted:5}[b.status]))
  const gateStyles={registered:{borderColor:'var(--ui-green)',icon:'✓'},active:{borderColor:'var(--ui-blue)',icon:'●'},waiting:{borderColor:'var(--ui-yellow)',icon:'○'},problem:{borderColor:'var(--ui-red)',icon:'!'},unknown:{borderColor:'var(--ui-stroke-secondary)',icon:'?'}}
  const statuses={draft:'草稿',active:'进行中',review:'待审查',accepted:'已验收',blocked:'受阻',cancelled:'已取消'}
  const result=r=>({pass:'通过',fail:'未通过',approved:'通过',rejected:'未通过'}[r] || (typeof r==='string' ? `其他：${text(r)}` : '未记录'))
  const card=(t)=>jsxs('section',{className:'border border-(--ui-stroke-secondary) rounded p-3 flex flex-col gap-2 min-w-0 break-words [overflow-wrap:anywhere]',children:[
    jsxs('div',{className:'flex flex-wrap justify-between gap-2 font-medium',children:[jsx('span',{children:`任务 · ${text(t.id)}`}),jsx('span',{style:{borderLeft:`3px solid ${({draft:'var(--ui-yellow)',active:'var(--ui-blue)',review:'var(--ui-yellow)',accepted:'var(--ui-stroke-secondary)',blocked:'var(--ui-red)',cancelled:'var(--ui-stroke-secondary)'})[t.status] || 'var(--ui-stroke-secondary)'}`,paddingLeft:'6px'},children:`账本状态：${statuses[t.status] || '状态未知'}`})]}),
    row('目标',t.goal),row('登记负责人',t.owner),row('审查覆盖',t.coverage),
    t.status==='blocked' && row('登记阻塞原因',t.blockReason),
    t.progress ? jsxs('div',{children:[row('最新历史进展登记时间',t.progress.at),row('历史登记进展',t.progress.evidence),row('历史登记的下一步',t.progress.next)]}) : row('历史进展','未登记'),
    jsxs('details',{children:[jsxs('summary',{style:{cursor:'pointer'},children:[jsx('span',{children:'查看五关详情（展开/收起）'}),jsx('span',{style:{display:'flex',flexWrap:'wrap',gap:'4px',marginTop:'6px',minWidth:0},children:(deriveGates(t)||[]).map(g=>{const theme=gateStyles[g.tone]||gateStyles.unknown;return jsxs('span',{'data-gate-summary':g.name,style:{display:'inline-flex',alignItems:'baseline',gap:'4px',border:'1px solid',borderColor:theme.borderColor,borderRadius:'4px',padding:'2px 5px',maxWidth:'100%',minWidth:0,overflowWrap:'anywhere'},children:[jsx('span',{'aria-hidden':true,style:{color:theme.borderColor},children:theme.icon}),jsx('span',{children:`${g.name} · ${g.label}`})]},g.name)})})]}),jsx('ol',{'aria-label':'五道关登记状态',className:'grid gap-1',children:(deriveGates(t)||[]).map(g=>{const theme=gateStyles[g.tone]||gateStyles.unknown;return jsxs('li',{'data-gate':g.name,'aria-label':`${g.name}：${g.label}。${g.detail}`,className:'rounded border p-2',style:{color:'var(--ui-text-primary)',backgroundColor:'var(--ui-bg-editor)',borderColor:theme.borderColor},children:[jsx('strong',{children:[jsx('span',{'aria-hidden':true,children:theme.icon}),' ',`${g.name} · ${g.label}`]}),jsx('div',{children:g.detail})]},g.name)})})]}),
    jsxs('details',{children:[jsx('summary',{children:'同任务轮次历史（展开）'}), (t.history||[]).some((h,i,a)=>i>0 && Date.parse(h.at)<Date.parse(a[i-1].at)) && jsx('div',{children:'时间异常：登记时间倒退；按账本记录顺序显示，不按时间排序。'}),...(t.rounds||[]).map((r,n)=>jsxs('section',{children:[jsx('strong',{children:`第 ${n+1} 轮 · 登记记录`}),...r.events.map((h,j)=>jsxs('div',{children:[row('登记时间',h.at),row('事件',events[h.command]||'未知'),h.command==='rework'&&row('登记返修原因',h.reason),h.command==='block'&&row('历史登记阻塞原因',h.task.blockReason),h.command==='cancel'&&row('登记取消原因',h.task.cancelReason),h.command==='review'&&row('登记审查人',h.task.review?.reviewer),h.command==='review'&&row('登记审查结论',h.task.review?.result==='fail'?'未通过':h.task.review?.result==='pass'?'通过（范围及真实性未核验）':'未知'),h.command==='progress'&&row('历史登记进展',h.task.progress?.evidence),h.command==='progress'&&row('历史登记的下一步',h.task.progress?.next)]},j))]},n))]})
  ]},t.id)
  return jsxs('div',{className:'flex h-full flex-col gap-3 overflow-auto p-3 text-sm',children:[
    jsxs('section',{className:'flex flex-col gap-2 border-b border-(--ui-stroke-secondary) pb-3',children:[
      jsx('div',{className:'font-medium',children:'协作工作台 · 只读'}),
      jsx('div',{className:'font-medium break-all',children:shown.folder ? '已选择项目（授权仅在最近一次读取时检查）' : '尚未选择项目'}),
      jsxs('div',{className:'flex flex-wrap gap-2',children:[jsx(Button,{onClick:pick,children:shown.folder?'切换项目':'选择项目'}),jsx(Button,{onClick:()=>controller.refresh(),disabled:!shown.folder,children:'刷新'}),jsx(Button,{onClick:()=>controller.clear(),disabled:!shown.folder,children:'断开视图（不撤销授权）'})]}),
      jsx('div',{role:'status',children:shown.message}),
      shown.updated && jsx('div',{className:'text-(--ui-text-secondary)',children:`读取时间：${shown.updated} · 来源：.collab/state.json`}),
      jsx('div',{className:'text-(--ui-text-secondary)',children:'会话目录不代表项目授权。外部撤销授权后，直到下一次刷新读取时才能检测到。断开仅清除视图；如需撤销持久授权，请前往 Capabilities → Plugins → Folder access。'})
    ]}),
    jsx('div',{className:'text-(--ui-text-secondary)',children:'读取时完整账本会进入内存。仅展示账本登记，状态不证明负责人在线或进程运行；未核验文件、证据、审查真实性或新鲜度。自由文本可能含敏感信息，常见凭据尽力遮盖，不保证全面脱敏；不展示审查及验收证据路径。'}),
    !shown.folder && jsx('div',{children:'选择并授权项目文件夹后查看任务。'}),
    shown.data && jsxs('div',{className:'flex flex-col gap-3',children:[
      jsx('div',{className:'font-medium',children:`项目总览 · 任务（${cards.length}）`}),
      jsx('div',{children:'任务 ID 和自由文本可能包含秘密，请谨慎分享。'}),
      jsxs('div',{children:[jsx('div',{className:'font-medium',children:'状态筛选'}),jsx('div',{role:'group','aria-label':'任务状态筛选',className:'flex flex-wrap gap-1',children:[['all','全部',cards.length],...Object.entries(statuses).map(([key,label])=>[key,label,counts[key]])].map(([key,label,count])=>jsx('button',{type:'button','aria-pressed':filter===key,onClick:()=>controller.setFilter(key),className:'rounded border px-2 py-1 break-words [overflow-wrap:anywhere]',style:{color:'var(--ui-text-primary)',backgroundColor:'var(--ui-bg-editor)',borderColor:filter===key?'var(--ui-accent)':'var(--ui-stroke-secondary)',maxWidth:'100%'},children:`${filter===key?'✓ ':''}${label}（${count}）`},key))})]}),
      cards.length===0 && jsx('div',{className:'text-(--ui-text-secondary)',children:'暂无任务；当前账本没有登记任务。'}),
      cards.length>0 && visible.length===0 && jsx('div',{children:'此状态暂无任务。'}),
      ...visible.filter(t=>t.status!=='accepted').map((t,i)=>card(t,i)),
      visible.some(t=>t.status==='accepted') && jsxs('details',{children:[jsx('summary',{children:`已验收（${visible.filter(t=>t.status==='accepted').length}）`}),...visible.filter(t=>t.status==='accepted').map((t,i)=>card(t,i))]})
    ]})
  ]})
}
export default {id:'direct-collab-workbench-sidebar',name:'协作工作台',register(ctx){ctx.register({id:'pane',area:'panes',title:'协作工作台',data:{placement:'right',width:'320px'},render:()=>jsx(Pane,{ctx})})}}
