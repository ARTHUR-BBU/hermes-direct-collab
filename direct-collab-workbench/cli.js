'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {validateAndProject,safeRelativePath} = require('./ledger-core');
const fail = m => { throw new Error(m); };
const required = (v, name) => { if (typeof v !== 'string' || !v.trim()) fail(`缺少 ${name}`); return v.trim(); };
const args = process.argv.slice(2), command = args.shift();
function option(name, fallback) { const i=args.indexOf(name); return i<0 ? fallback : args[i+1]; }
const project=path.resolve(option('--project', process.cwd())), dir=path.join(project,'.collab'), stateFile=path.join(dir,'state.json'), lock=path.join(dir,'lock');
function identity(file) { const s=fs.statSync(file,{bigint:true}); return `${s.dev}:${s.ino}`; }
function safePath(relative, missing=false) {
  required(relative,'路径');
  if (!safeRelativePath(relative) || path.isAbsolute(relative)) fail('路径必须是项目内相对路径，不能指向 .collab');
  let current=project, absent=false;
  for (const part of relative.split('/')) {
    current=path.join(current,part);
    if(absent) continue;
    let st; try { st=fs.lstatSync(current); } catch(e) { if(e.code==='ENOENT' && missing) { absent=true; continue; } throw e; }
    if(st.isSymbolicLink()) fail('不允许符号链接路径');
    if(st.isFile() && fs.existsSync(dir)) for(const name of fs.readdirSync(dir)) { const f=path.join(dir,name), internal=fs.lstatSync(f); if(internal.isFile() && identity(current)===identity(f)) fail('路径不能硬链接到 .collab'); }
  }
  return current;
}
function safeFile(relative) { const f=safePath(relative); if(!fs.statSync(f).isFile()) fail('路径必须指向存在的普通文件'); return f; }
function hash(relative) { return crypto.createHash('sha256').update(fs.readFileSync(safeFile(relative))).digest('hex'); }
function tree(relative) {
  const f=safePath(relative), st=fs.lstatSync(f);
  if(st.isFile()) return ['file',hash(relative)];
  if(!st.isDirectory()) fail('路径必须是普通文件或目录');
  return ['directory',fs.readdirSync(f).sort().map(n=>[n,tree(`${relative}/${n}`)])];
}
function snapshot(paths) { return Object.fromEntries(paths.map(p => { const v=tree(p); return [p,v[0]==='file'?v[1]:crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')]; })); }
function identities(relative) { const f=safePath(relative,true); if(!fs.existsSync(f)) return []; const st=fs.lstatSync(f); if(st.isFile()) return [identity(f)]; if(!st.isDirectory()) fail('路径必须是普通文件或目录'); return fs.readdirSync(f).flatMap(n=>identities(`${relative}/${n}`)); }
function same(a,b) { return JSON.stringify(a)===JSON.stringify(b); }
function coverage(t) { if(!t.review) return 'none'; if(!('coveredPaths' in t.review)) return 'legacy-unknown'; return t.review.coveredPaths.length===t.paths.length ? 'full' : 'partial'; }
function validCoverage(t) { const r=t.review; return !r || !('coveredPaths' in r) || (Array.isArray(r.coveredPaths) && r.coveredPaths.length>0 && new Set(r.coveredPaths).size===r.coveredPaths.length && r.coveredPaths.every(p=>t.paths.includes(p)) && same(r.snapshot,t.hashes)); }
function readState() {
  // Conservative preflight only: lstat and read are not atomic against hostile writers.
  let st; try { st=fs.lstatSync(stateFile); } catch { fail('状态丢失或损坏'); }
  if(st.isSymbolicLink() || !st.isFile()) fail('状态文件必须为普通文件，不能是符号链接');
  let s; try { s=JSON.parse(fs.readFileSync(stateFile,'utf8')); } catch { fail('状态丢失或损坏'); }
  validateAndProject(s);
  return s;
}
function conflict(a,b) {
  return a.some(x=>b.some(y=>{
    const cx=process.platform==='win32'?x.toLowerCase():x, cy=process.platform==='win32'?y.toLowerCase():y;
    if(cx===cy || cx.startsWith(cy+'/') || cy.startsWith(cx+'/')) return true;
    const xs=new Set(identities(x)); return identities(y).some(id=>xs.has(id));
  }));
}
function stale(t) { try { return !!((t.hashes && !same(t.hashes,snapshot(t.paths))) || (t.review && hash(t.review.evidence)!==t.review.evidenceHash) || (t.verification && hash(t.verification.evidence)!==t.verification.hash)); } catch { return true; } }
function currentNext(t, isStale, s) {
  switch(t.status) {
    case 'draft': return '核对任务信息，准备启动任务';
    case 'active': return '核对历史进度和实际情况，决定并继续当前工作';
    case 'blocked': return '处理阻塞原因；条件满足后再恢复任务';
    case 'cancelled': return '任务已取消；如需继续，请另行决定后续安排';
    case 'accepted': return isStale ? '原验收已失效；核查变化并决定是否创建新任务重新审查和验收' : '已验收，当前无需继续此任务';
    case 'review':
      if(isStale) return '快照或审查证据已失效；核查后重新提交并重新审查';
      if(s && [...s.history].reverse().find(h=>h.id===t.id && h.command==='submit')?.coverageGate!==1) return '旧提交须重新提交并登记新审查范围';
      if(!t.review) return '等待独立审查并记录审查结果';
      if(coverage(t)==='legacy-unknown') return '旧审查范围未知；重新提交并登记新审查范围';
      if(coverage(t)==='partial') return '审查范围不完整；补充完整审查，或返修后重新提交';
      if(t.review.result==='fail') return '核对审查意见，修正后重新提交并重新审查';
      return '审查记录通过；仍需独立验证并由操作员决定是否验收';
  }
}
function coverageText(t) { const c=coverage(t); return c==="legacy-unknown" ? "旧审查范围未知" : c==="none" ? "未记录" : `${c==="full" ? "完整" : "部分"}；已覆盖：${t.review.coveredPaths.join(", " )}；未覆盖：${t.paths.filter(p=>!t.review.coveredPaths.includes(p)).join(", " ) || "无"}`; }
function handoff(s) { return ['# 协作交接台', '', `更新时间：${new Date().toISOString()}`, '', ...s.tasks.flatMap(t => { const isStale=stale(t); return [`## ${t.id} · ${t.status}`, `- 目标：${t.goal}`, `- 负责人：${t.owner}`, `- 文件：${t.paths.join(', ')}`, `- 接口：${t.interfaces.join(', ')}`, `- 验收：${t.acceptance}`, `- 时间预算：${t.budgetMinutes} 分钟`, `- 历史进展：${t.progress?.evidence || '未记录'}`, `- 历史下一步（当时记录）：${t.progress?.next || '未记录'}`, `- 当前建议：${currentNext(t,isStale,s)}`, `- 阻塞：${t.blockReason || '无'}`, `- 新鲜度：${isStale ? '已失效（文件或证据已改变或无法读取；原验收不代表当前内容有效）' : (t.hashes || t.review || t.verification ? '正常' : '未提交，尚无快照')}`, `- 审查范围：${coverageText(t)}`, `- 审查：${t.review ? `${t.review.reviewer} / ${t.review.result} / ${t.review.evidence}` : '未记录'}`, '']; })].join('\n'); }
function execute() {
 if (!command || command==='help') return {help:'用法：node cli.js <init|create|start|process|progress|block|resume|submit|review|rework|accept|cancel|status|handoff> --project 项目路径 --json JSON对象；详见 README.md'};
 if (!fs.statSync(project).isDirectory()) fail('项目目录不存在');
 let data; try { data=JSON.parse(option('--json','{}')); } catch { fail('JSON 参数无效'); } if (!data || Array.isArray(data) || typeof data!=='object') fail('JSON 参数必须是对象');
 if (command==='init') {
   fs.mkdirSync(dir); // exclusive: never adopt or overwrite an existing directory
   try { fs.writeFileSync(stateFile,JSON.stringify({version:1,tasks:[],history:[]},null,2)+'\n',{flag:'wx'}); } catch(e) { throw e; }
   return {ok:true};
 }
 const lst=fs.lstatSync(dir); if (!lst.isDirectory() || lst.isSymbolicLink()) fail('.collab 必须为普通目录');
 let fd; try { fd=fs.openSync(lock,'wx'); } catch { fail('工作台被锁定；确认没有运行中的命令后，人工检查 .collab/lock'); }
 try {
   const s=readState();
   if (command==='status') { const now=Date.now(); return {...s,tasks:s.tasks.map(t=>{ const isStale=stale(t); return {...t,coverage:coverage(t),uncoveredPaths:t.review?.coveredPaths ? t.paths.filter(p=>!t.review.coveredPaths.includes(p)) : null,stale:isStale,overdue:t.status==='active' && !!t.startedAt && now-Date.parse(t.startedAt)>t.budgetMinutes*60000,progressIsHistorical:!!t.progress,currentNext:currentNext(t,isStale,s)}; })}; }
   if (command==='handoff') return {markdown:handoff(s)};
   let t;
   if (command==='create') {
     const id=required(data.id,'id'); if (!/^[\w-]+$/.test(id) || s.tasks.some(x=>x.id===id)) fail('id 无效或重复');
     const paths=data.paths, interfaces=data.interfaces;
     if (!Array.isArray(paths)||!paths.length||new Set(paths).size!==paths.length) fail('必须提供不重复的文件路径'); paths.forEach(p=>safePath(p,true));
     if (!Array.isArray(interfaces)||!interfaces.length) fail('必须提供接口'); interfaces.forEach(x=>required(x,'接口'));
     if (!Number.isFinite(data.budgetMinutes)||data.budgetMinutes<=0) fail('时间预算必须为正数');
     t={id,goal:required(data.goal,'目标'),owner:required(data.owner,'负责人'),paths,interfaces,acceptance:required(data.acceptance,'验收'),budgetMinutes:data.budgetMinutes,status:'draft'}; s.tasks.push(t);
   } else {
     t=s.tasks.find(x=>x.id===data.id); if (!t) fail('任务不存在');
     const expect=(...states)=>{if(!states.includes(t.status)) fail(`状态 ${t.status} 不允许 ${command}`);};
     const ensureFree=()=>{ t.paths.forEach(identities); if(s.tasks.some(x=>x.id!==t.id && (['active','review'].includes(x.status) || (x.status==='blocked' && ['active','review'].includes(x.previousStatus))) && conflict(x.paths,t.paths))) fail('文件路径被其他活动任务占用');};
     switch(command) {
       case 'start': expect('draft'); ensureFree(); t.status='active'; t.startedAt=new Date().toISOString(); break;
       case 'process': expect('active','blocked','review'); if(!Number.isSafeInteger(data.pid) || data.pid<=0 || (data.exitCode!==null && !Number.isSafeInteger(data.exitCode))) fail('pid 或退出码无效'); t.process={pid:data.pid,session:required(data.session,'会话'),exitCode:data.exitCode,at:new Date().toISOString()}; break;
      case 'progress': expect('active'); t.progress={evidence:required(data.evidence,'进度证据'),next:required(data.next,'下一步'),at:new Date().toISOString()}; break;
       case 'block': expect('draft','active','review'); t.previousStatus=t.status; t.status='blocked'; t.blockReason=required(data.reason,'阻塞原因'); break;
       case 'resume': expect('blocked'); if(['active','review'].includes(t.previousStatus)) ensureFree(); t.status=t.previousStatus; delete t.previousStatus; delete t.blockReason; break;
       case 'submit': expect('active','review'); ensureFree(); t.hashes=snapshot(t.paths); t.status='review'; delete t.review; break;
       case 'review': expect('review'); ensureFree(); if(coverage(t)==='legacy-unknown' || [...s.history].reverse().find(h=>h.id===t.id && h.command==='submit')?.coverageGate!==1) fail('旧提交或审查范围未知，请重新提交'); if (!same(t.hashes,snapshot(t.paths))) fail('待审文件已改变，请重新提交');
         {const reviewer=required(data.reviewer,'审查人'); if(reviewer===t.owner) fail('审查人必须与负责人不同'); if(!['pass','fail'].includes(data.result)) fail('审查结论必须为 pass 或 fail'); const coveredPaths=data.coveredPaths; if(!Array.isArray(coveredPaths) || !coveredPaths.length || new Set(coveredPaths).size!==coveredPaths.length || !coveredPaths.every(p=>t.paths.includes(p))) fail('审查范围必须是不重复的提交路径单位'); const evidence=required(data.evidence,'审查证据'); t.review={reviewer,result:data.result,evidence,evidenceHash:hash(evidence),coveredPaths,snapshot:{...t.hashes},at:new Date().toISOString()};} break;
      case 'rework': expect('review'); ensureFree(); required(data.reason,'返修原因'); t.status='active'; delete t.review; break;
       case 'accept': expect('review'); ensureFree(); if([...s.history].reverse().find(h=>h.id===t.id && h.command==='submit')?.coverageGate!==1) fail('旧提交须重新提交并登记新审查范围'); if(!same(t.hashes,snapshot(t.paths))) fail('待审文件已改变'); if(!t.review || t.review.result!=='pass' || coverage(t)!=='full' || hash(t.review.evidence)!==t.review.evidenceHash) fail('审查未通过、范围不完整或审查证据已改变');
         {const evidence=required(data.evidence,'独立验证证据'); if(identity(safeFile(evidence))===identity(safeFile(t.review.evidence))) fail('独立验证需使用单独的证据文件'); t.verification={evidence,hash:hash(evidence)};} t.status='accepted'; break;
       case 'cancel': expect('draft','active','review','blocked'); t.cancelReason=required(data.reason,'取消原因'); t.status='cancelled'; break;
       default: fail('未知命令');
     }
   }
   s.history.push({at:new Date().toISOString(),command,id:t.id,...(command==='submit'?{coverageGate:1}:{}),...(command==='rework'?{reason:data.reason.trim()}:{}),task:JSON.parse(JSON.stringify(t))});
   validateAndProject(s); // Never persist a state that the next read would reject.
  const temp=path.join(dir,`state.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`);
   try { fs.writeFileSync(temp,JSON.stringify(s,null,2)+'\n',{flag:'wx'}); fs.renameSync(temp,stateFile); } finally { try { fs.unlinkSync(temp); } catch {} }
   return {ok:true,task:t};
 } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}
try { process.stdout.write(JSON.stringify(execute())+'\n'); } catch(e) { process.stdout.write(JSON.stringify({ok:false,error:e.message})+'\n'); process.exitCode=1; }
