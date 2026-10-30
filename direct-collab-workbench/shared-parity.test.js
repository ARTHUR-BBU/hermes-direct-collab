'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {validateAndProject}=require('./ledger-core');

test('bundled sidebar and CLI reject identical corruptions and agree on legacy ledger',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../direct-collab-workbench-sidebar/plugin.js'),'utf8').replace(/^import .*$/gm,'');
 const plugin=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const original=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/legacy-synthetic-state.json'),'utf8'));
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'collab-parity-'));
 try {
  fs.mkdirSync(path.join(root,'.collab'));
  const run=s=>{fs.writeFileSync(path.join(root,'.collab','state.json'),JSON.stringify(s));return spawnSync(process.execPath,[path.join(__dirname,'cli.js'),'status','--project',root],{encoding:'utf8'});};
  const expected=validateAndProject(original);
  const projected=plugin.parseState(JSON.stringify(original));
  assert.deepEqual(projected.tasks[0].gates,expected.tasks[0].gates);
  assert.equal(projected.tasks[0].coverage,'旧审查范围未知');
  const ok=run(original); assert.equal(ok.status,0,ok.stderr); assert.equal(JSON.parse(ok.stdout).tasks[0].coverage,'legacy-unknown');
  const cases=[];
  let s=structuredClone(original); s.history.find(h=>h.command==='submit').coverageGate=1; cases.push(s);
  s=structuredClone(original); {const create=s.history[0], task={...create.task,status:'cancelled'}; s.history=[create,{at:create.at,command:'cancel',id:task.id,task}];s.tasks=[task];} cases.push(s);
  s=structuredClone(original); s.history=[]; cases.push(s);
  s=structuredClone(original); s.tasks[0].status='active'; cases.push(s);
  s=structuredClone(original); s.history[0].at='invalid'; cases.push(s);
  s=structuredClone(original); s.tasks[0].paths.push(s.tasks[0].paths[0]); cases.push(s);
  s=structuredClone(original); s.tasks.push(structuredClone(s.tasks[0])); cases.push(s);
  for(const invalid of cases) {assert.throws(()=>validateAndProject(invalid));assert.throws(()=>plugin.parseState(JSON.stringify(invalid)));const result=run(invalid);assert.notEqual(result.status,0,result.stdout);}
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});
