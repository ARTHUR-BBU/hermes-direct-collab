'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {validateAndProject}=require('./ledger-core');

test('legacy accepted records retain their historical evidence paths',()=>{
 const s=structuredClone(require('./fixtures/legacy-synthetic-state.json'));
 s.tasks[0].review.evidence='.CoLlAb. /state.json';
 for(const h of s.history) if(h.task.review) h.task.review.evidence='.CoLlAb. /state.json';
 assert.doesNotThrow(()=>validateAndProject(s));
 const review=s.tasks[0].review.evidence;
 s.tasks[0].verification.evidence=review;
 s.history.at(-1).task.verification.evidence=review;
 s.tasks[0].review.evidence='historic:review';
 for(const h of s.history) if(h.task.review) h.task.review.evidence='historic:review';
 assert.doesNotThrow(()=>validateAndProject(s));
});

test('CLI refuses case aliases before persisting even if filesystem reports distinct files',()=>{
 const p=fs.mkdtempSync(path.join(os.tmpdir(),'case-replay-'));
 const invoke=(cmd,data={},extra=[])=>spawnSync(process.execPath,[...extra,path.join(__dirname,'cli.js'),cmd,'--project',p,'--json',JSON.stringify(data)],{encoding:'utf8'});
 try {
  for(const f of ['artifact','review']) fs.writeFileSync(path.join(p,f),f);
  if(process.platform!=='win32') fs.writeFileSync(path.join(p,'REVIEW'),'distinct');
  for(const [cmd,data] of [['init',{}],['create',{id:'t',goal:'g',owner:'A',paths:['artifact'],interfaces:['i'],acceptance:'ok',budgetMinutes:1}],['start',{id:'t'}],['submit',{id:'t'}],['review',{id:'t',reviewer:'B',result:'pass',evidence:'review',coveredPaths:['artifact']}]]) assert.equal(invoke(cmd,data).status,0,cmd);
  const hook=path.join(p,'mock.cjs');
  fs.writeFileSync(hook,`Object.defineProperty(process,'platform',{value:'win32'}); const fs=require('node:fs'); const orig=fs.statSync; fs.statSync=function(p,...a){const s=orig.call(this,p,...a); if(String(p).endsWith('REVIEW')) s.ino=999999999n; return s}`);
  const file=path.join(p,'.collab','state.json'), before=fs.readFileSync(file,'utf8');
  const result=invoke('accept',{id:'t',evidence:'REVIEW'},['--require',hook]);
  assert.notEqual(result.status,0,result.stdout); assert.match(result.stdout,/证据/);
  assert.equal(fs.readFileSync(file,'utf8'),before); assert.equal(invoke('status').status,0);
 } finally {fs.rmSync(p,{recursive:true,force:true})}
});

test('new gated replay rejects identical and normalized evidence paths across core, CLI and sidebar',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../direct-collab-workbench-sidebar/plugin.js'),'utf8').replace(/^import .*$/gm,'');
 const sidebar=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const p=fs.mkdtempSync(path.join(os.tmpdir(),'evidence-replay-'));
 const file=path.join(p,'.collab','state.json');
 const invoke=(cmd,data={})=>spawnSync(process.execPath,[path.join(__dirname,'cli.js'),cmd,'--project',p,'--json',JSON.stringify(data)],{encoding:'utf8'});
 const run=(cmd,data={})=>{const r=invoke(cmd,data);assert.equal(r.status,0,`${cmd}: ${r.stdout} ${r.stderr}`);return JSON.parse(r.stdout)};
 try {
  for(const f of ['artifact','review','verify'])fs.writeFileSync(path.join(p,f),f);
  run('init');run('create',{id:'t',goal:'g',owner:'A',paths:['artifact'],interfaces:['i'],acceptance:'ok',budgetMinutes:1});run('start',{id:'t'});run('submit',{id:'t'});run('review',{id:'t',reviewer:'B',result:'pass',evidence:'review',coveredPaths:['artifact']});
  assert.notEqual(invoke('accept',{id:'t',evidence:'review'}).status,0);
  run('accept',{id:'t',evidence:'verify'});
  const original=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.doesNotThrow(()=>validateAndProject(original));assert.doesNotThrow(()=>sidebar.parseState(JSON.stringify(original)));assert.equal(invoke('status').status,0);
  for(const evidence of ['.collab./state.json','.collab /state.json','.CoLlAb... /state.json','.COLLAB . ./state.json','bad:name','/outside','x\\y','.collab/state.json','./review']) {
   const state=structuredClone(original); state.tasks[0].review.evidence=evidence;
   for(const h of state.history) if(h.task.review) h.task.review.evidence=evidence;
   fs.writeFileSync(file,JSON.stringify(state));
   assert.throws(()=>validateAndProject(state),/证据/); assert.throws(()=>sidebar.parseState(JSON.stringify(state)),/证据/);
   const r=invoke('status'); assert.notEqual(r.status,0); assert.match(JSON.parse(r.stdout).error,/证据/);
  }
  for(const evidence of ['.collab./state.json','.collab /state.json','.CoLlAb... /state.json','.COLLAB . ./state.json','review','./review','dir/../review','bad:name','/outside','x\\y','.collab/state.json',...(process.platform==='win32'?['REVIEW','review.','review ']:[])]) {
   const state=structuredClone(original);state.tasks[0].verification.evidence=evidence;state.history.at(-1).task.verification.evidence=evidence;
   fs.writeFileSync(file,JSON.stringify(state));
   assert.throws(()=>validateAndProject(state),/证据/);assert.throws(()=>sidebar.parseState(JSON.stringify(state)),/证据/);
   const r=invoke('status');assert.notEqual(r.status,0);assert.match(JSON.parse(r.stdout).error,/证据/);
  }
 } finally {fs.rmSync(p,{recursive:true,force:true})}
});
