const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const cli = path.join(__dirname, 'cli.js');
function run(root, command, data = {}) {
  const p = spawnSync(process.execPath, [cli, command, '--project', root, '--json', JSON.stringify(data)], { encoding: 'utf8' });
  let out; try { out = JSON.parse(p.stdout); } catch { out = { error: p.stderr || p.stdout }; }
  return { ok: p.status === 0, out };
}
function setup() { const p = fs.mkdtempSync(path.join(os.tmpdir(), 'direct-test-')); fs.writeFileSync(path.join(p, 'code.txt'), 'one'); fs.writeFileSync(path.join(p, 'evidence.txt'), 'checked'); fs.writeFileSync(path.join(p, 'verify.txt'), 'verified'); return p; }
const task = { id: 't1', goal: '实现', owner: 'owner-example', paths: ['code.txt'], interfaces: ['CLI'], acceptance: 'tests pass', budgetMinutes: 1 };
test('init does not overwrite and corrupt state fails closed', () => {
  const p = setup(); assert.equal(run(p,'init').ok,true); assert.equal(run(p,'init').ok,false); assert.equal(fs.readFileSync(path.join(p,'code.txt'),'utf8'),'one');
  fs.writeFileSync(path.join(p,'.collab','state.json'), '{'); assert.equal(run(p,'status').ok,false);
});
test('dispatch fields, conflicts, blocking and recovery', () => {
 const p = setup(); assert.equal(run(p,'init').ok,true); assert.equal(run(p,'create',{id:'bad'}).ok,false); assert.equal(run(p,'create',task).ok,true);
 assert.equal(run(p,'start',{id:'t1'}).ok,true); assert.equal(run(p,'create',{...task,id:'t2'}).ok,true); assert.equal(run(p,'start',{id:'t2'}).ok,false);
 assert.equal(run(p,'block',{id:'t1', reason:'等待'}).ok,true); assert.equal(run(p,'resume',{id:'t1'}).ok,true);
 assert.equal(run(p,'progress',{id:'t1', evidence:'完成草稿', next:'审查'}).ok,true); assert.equal(run(p,'status').out.tasks[0].status,'active');
});
test('review and acceptance require existing evidence, current hashes and independent reviewer', () => {
 const p=setup(); run(p,'init'); run(p,'create',task); run(p,'start',{id:'t1'});
 assert.equal(run(p,'submit',{id:'t1'}).ok,true);
 assert.equal(run(p,'review',{id:'t1', coveredPaths:['code.txt'], reviewer:'owner-example', result:'pass', evidence:'evidence.txt'}).ok,false);
 assert.equal(run(p,'review',{id:'t1', coveredPaths:['code.txt'], reviewer:'reviewer-example', result:'pass', evidence:'missing.txt'}).ok,false);
 assert.equal(run(p,'review',{id:'t1', coveredPaths:['code.txt'], reviewer:'reviewer-example', result:'pass', evidence:'evidence.txt'}).ok,true);
 assert.equal(run(p,'accept',{id:'t1', evidence:'missing.txt'}).ok,false);
 fs.writeFileSync(path.join(p,'code.txt'),'changed'); assert.equal(run(p,'accept',{id:'t1', evidence:'evidence.txt'}).ok,false);
 assert.equal(run(p,'submit',{id:'t1'}).ok,true); assert.equal(run(p,'review',{id:'t1', coveredPaths:['code.txt'], reviewer:'reviewer-example', result:'pass', evidence:'evidence.txt'}).ok,true);
 assert.equal(run(p,'accept',{id:'t1', evidence:'verify.txt'}).ok,true); assert.equal(run(p,'status').out.tasks[0].status,'accepted');
});
test('reject traversal and unsafe evidence paths', () => {
 const p=setup(); run(p,'init'); assert.equal(run(p,'create',{...task,paths:['../outside']}).ok,false);
});
test('status reports stale acceptance and overdue without claiming process progress', () => {
 const p=setup(); run(p,'init'); run(p,'create',{...task,budgetMinutes:0.000001}); run(p,'start',{id:'t1'});
 assert.equal(run(p,'status').out.tasks[0].overdue,true);
 run(p,'submit',{id:'t1'}); run(p,'review',{id:'t1',coveredPaths:['code.txt'], reviewer:'reviewer-example',result:'pass',evidence:'evidence.txt'}); run(p,'accept',{id:'t1',evidence:'verify.txt'});
 assert.equal(run(p,'status').out.tasks[0].stale,false);
 fs.writeFileSync(path.join(p,'verify.txt'),'changed'); assert.equal(run(p,'status').out.tasks[0].stale,true);
});
test('handoff warns when accepted files or evidence become stale', () => {
 const p=setup(); for(const [cmd,data] of [['init',{}],['create',task],['start',{id:'t1'}],['submit',{id:'t1'}],['review',{id:'t1',coveredPaths:['code.txt'], reviewer:'reviewer-example',result:'pass',evidence:'evidence.txt'}],['accept',{id:'t1',evidence:'verify.txt'}]]) assert.equal(run(p,cmd,data).ok,true,cmd);
 assert.match(run(p,'handoff').out.markdown,/新鲜度：正常/);
 for(const f of ['code.txt','evidence.txt','verify.txt']) { const old=fs.readFileSync(path.join(p,f)); fs.appendFileSync(path.join(p,f),' changed'); assert.equal(run(p,'status').out.tasks[0].stale,true); assert.match(run(p,'handoff').out.markdown,/新鲜度：已失效/); fs.writeFileSync(path.join(p,f),old); }
 fs.unlinkSync(path.join(p,'code.txt')); assert.match(run(p,'handoff').out.markdown,/新鲜度：已失效/);
});
test('inconsistent task history fails closed for reads and writes', () => {
 for(const mutate of [s=>s.history=[], s=>s.history.splice(1,1), s=>s.history.at(-1).id='other', s=>s.history.at(-1).command='accept', s=>s.tasks[0].goal='changed']) {
  const p=setup(); for(const [cmd,data] of [['init',{}],['create',task],['start',{id:'t1'}],['progress',{id:'t1',evidence:'done',next:'review'}]]) assert.equal(run(p,cmd,data).ok,true);
  const f=path.join(p,'.collab','state.json'), s=JSON.parse(fs.readFileSync(f)); mutate(s); fs.writeFileSync(f,JSON.stringify(s));
  for(const cmd of ['status','handoff','submit']) assert.equal(run(p,cmd,{id:'t1'}).ok,false,cmd);
 }
});
test('two real project directories: calculator copy and new project, evidence hashes match', () => {
 const base=fs.mkdtempSync(path.join(__dirname,'smoke-'));
 try {
  for (const name of ['calculator-copy','new-project']) {
   const p=path.join(base,name); fs.mkdirSync(p);
   if(name==='calculator-copy') fs.copyFileSync(path.join(__dirname,'fixtures','calculator-index.html'),path.join(p,'code.txt'));
   else fs.writeFileSync(path.join(p,'code.txt'),'fresh project');
   fs.writeFileSync(path.join(p,'review.txt'),'manual review record'); fs.writeFileSync(path.join(p,'verify.txt'),'manual verification record');
   for(const [cmd,data] of [['init',{}],['create',task],['start',{id:'t1'}],['submit',{id:'t1'}],['review',{id:'t1',coveredPaths:['code.txt'], reviewer:'reviewer-example',result:'pass',evidence:'review.txt'}],['accept',{id:'t1',evidence:'verify.txt'}]]) assert.equal(run(p,cmd,data).ok,true,cmd);
   const t=run(p,'status').out.tasks[0], crypto=require('node:crypto');
   const h=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(p,f))).digest('hex');
   assert.equal(t.hashes['code.txt'],h('code.txt')); assert.equal(t.review.evidenceHash,h('review.txt')); assert.equal(t.verification.hash,h('verify.txt'));
   assert.equal(t.stale,false); fs.appendFileSync(path.join(p,'code.txt'),' changed'); assert.equal(run(p,'status').out.tasks[0].stale,true);
  }
 } finally { fs.rmSync(base,{recursive:true,force:true}); }
});
