'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), os=require('node:os'), path=require('node:path');
const {spawnSync}=require('node:child_process');
const {validateAndProject}=require('./ledger-core');

test('real CLI multi-round lifecycle agrees with core and bundled sidebar, including rejected actions',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../direct-collab-workbench-sidebar/plugin.js'),'utf8').replace(/^import .*$/gm,'');
 const plugin=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const p=fs.mkdtempSync(path.join(os.tmpdir(),'lifecycle-parity-'));
 const file=path.join(p,'.collab','state.json');
 const invoke=(cmd,data={})=>spawnSync(process.execPath,[path.join(__dirname,'cli.js'),cmd,'--project',p,'--json',JSON.stringify(data)],{encoding:'utf8'});
 const run=(cmd,data={})=>{const r=invoke(cmd,data);assert.equal(r.status,0,`${cmd}: ${r.stdout} ${r.stderr}`);return JSON.parse(r.stdout)};
 const check=()=>{
  const raw=fs.readFileSync(file,'utf8'), state=JSON.parse(raw), core=validateAndProject(state), side=plugin.parseState(raw), status=run('status');
  assert.equal(status.tasks.length,core.tasks.length);assert.equal(side.tasks.length,core.tasks.length);
  for(let i=0;i<core.tasks.length;i++){
   assert.equal(status.tasks[i].id,core.tasks[i].id);assert.equal(status.tasks[i].status,core.tasks[i].status);
   assert.equal(status.tasks[i].coverage,core.tasks[i].coverage);assert.equal(side.tasks[i].status,core.tasks[i].status);
   assert.equal(side.tasks[i].coverage,({none:'未记录','legacy-unknown':'旧审查范围未知',partial:'部分（登记声明）',full:'完整（登记声明）'})[core.tasks[i].coverage]);
   assert.deepEqual(side.tasks[i].gates,core.tasks[i].gates);
  }
 };
 const reject=(cmd,data)=>{const before=fs.readFileSync(file,'utf8'),r=invoke(cmd,data);assert.notEqual(r.status,0,`${cmd}: ${r.stdout}`);assert.equal(fs.readFileSync(file,'utf8'),before);check()};
 try {
  for(const f of ['a','b','review','verify'])fs.writeFileSync(path.join(p,f),f);
  run('init');check();
  const step=(cmd,data)=>{run(cmd,data);check()};
  step('create',{id:'t',goal:'g',owner:'owner-example',paths:['a','b'],interfaces:['i'],acceptance:'ok',budgetMinutes:5});
  step('start',{id:'t'});step('progress',{id:'t',evidence:'progress',next:'next'});
  step('block',{id:'t',reason:'wait'});reject('submit',{id:'t'});step('resume',{id:'t'});
  step('submit',{id:'t'});step('review',{id:'t',reviewer:'reviewer-example',result:'fail',evidence:'review',coveredPaths:['a','b']});
  reject('accept',{id:'t',evidence:'verify'});step('rework',{id:'t',reason:'fix'});
  fs.appendFileSync(path.join(p,'a'),' fix');step('submit',{id:'t'});
  step('review',{id:'t',reviewer:'reviewer-example',result:'pass',evidence:'review',coveredPaths:['a']});reject('accept',{id:'t',evidence:'verify'});
  step('review',{id:'t',reviewer:'reviewer-example',result:'pass',evidence:'review',coveredPaths:['a','b']});
  fs.linkSync(path.join(p,'review'),path.join(p,'review-alias'));reject('accept',{id:'t',evidence:'review-alias'});
  step('block',{id:'t',reason:'review pause'});step('resume',{id:'t'});step('accept',{id:'t',evidence:'verify'});
  step('create',{id:'cancelled',goal:'g',owner:'owner-example',paths:['b'],interfaces:['i'],acceptance:'ok',budgetMinutes:5});
  step('start',{id:'cancelled'});step('block',{id:'cancelled',reason:'stop'});step('cancel',{id:'cancelled',reason:'cancel'});reject('resume',{id:'cancelled'});
  const original=fs.readFileSync(file,'utf8'), corrupt=JSON.parse(original);corrupt.history.at(-1).at='invalid';fs.writeFileSync(file,JSON.stringify(corrupt));
  assert.throws(()=>validateAndProject(corrupt));assert.throws(()=>plugin.parseState(JSON.stringify(corrupt)));assert.notEqual(invoke('status').status,0);
 } finally {fs.rmSync(p,{recursive:true,force:true})}
});
