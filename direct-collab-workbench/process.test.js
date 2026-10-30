'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'); const os=require('node:os'); const path=require('node:path'); const {spawnSync}=require('node:child_process');
const cli=path.join(__dirname,'cli.js');
test('manual process session and exit records survive restart without implying progress',t=>{
  const p=fs.mkdtempSync(path.join(os.tmpdir(),'collab-process-')); t.after(()=>fs.rmSync(p,{recursive:true,force:true}));
  const run=(cmd,data={})=>spawnSync(process.execPath,[cli,cmd,'--project',p,'--json',JSON.stringify(data)],{encoding:'utf8'});
  fs.writeFileSync(path.join(p,'file.txt'),'a');
  assert.equal(run('init').status,0);
  assert.equal(run('create',{id:'x',goal:'g',owner:'a',paths:['file.txt'],interfaces:['cli'],acceptance:'ok',budgetMinutes:1}).status,0);
  assert.equal(run('start',{id:'x'}).status,0);
  assert.equal(run('process',{id:'x',pid:123,session:'session-1',exitCode:0}).status,0);
  const state=JSON.parse(run('status').stdout).tasks[0];
  assert.equal(state.process.pid,123); assert.equal(state.process.session,'session-1'); assert.equal(state.process.exitCode,0); assert.equal(state.progress,undefined);
  assert.notEqual(run('process',{id:'x',pid:-1,session:'s',exitCode:0}).status,0);
  const statePath=path.join(p,'.collab','state.json'); const corrupt=JSON.parse(fs.readFileSync(statePath)); corrupt.tasks[0].process.pid=-1; fs.writeFileSync(statePath,JSON.stringify(corrupt));
  assert.notEqual(run('status').status,0);
});
