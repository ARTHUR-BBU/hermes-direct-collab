'use strict';
const {test}=require('node:test'); const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('state.json symbolic link rejected without changing target',t=>{
 const p=fs.mkdtempSync(path.join(os.tmpdir(),'ledger-link-'));
 try {const d=path.join(p,'.collab');fs.mkdirSync(d);const target=path.join(p,'target');const raw=JSON.stringify({version:1,tasks:[],history:[]});fs.writeFileSync(target,raw);
 try{fs.symlinkSync(target,path.join(d,'state.json'),'file')}catch(e){if(['EPERM','EACCES','ENOSYS'].includes(e.code)){t.skip('symlink creation unavailable: '+e.code);return}throw e}
 const r=spawnSync(process.execPath,[path.join(__dirname,'cli.js'),'status','--project',p],{encoding:'utf8'});assert.notEqual(r.status,0,r.stdout);assert.equal(fs.readFileSync(target,'utf8'),raw);
 } finally {fs.rmSync(p,{recursive:true,force:true})}
});
test('CLI rejects a state entry reported as a symlink before reading it',()=>{
 const p=fs.mkdtempSync(path.join(os.tmpdir(),'ledger-lstat-'));
 try {
  const d=path.join(p,'.collab');fs.mkdirSync(d);const file=path.join(d,'state.json');
  const raw=JSON.stringify({version:1,tasks:[],history:[]});fs.writeFileSync(file,raw);
  const hook=path.join(p,'hook.cjs');fs.writeFileSync(hook,`const fs=require('node:fs');const orig=fs.lstatSync;fs.lstatSync=function(p,...args){const s=orig.call(this,p,...args);if(String(p).endsWith('state.json'))s.isSymbolicLink=()=>true;return s}`);
  for(const command of ['status','create']){
   const r=spawnSync(process.execPath,['--require',hook,path.join(__dirname,'cli.js'),command,'--project',p,'--json',JSON.stringify({id:'x',goal:'g',owner:'a',paths:['x'],interfaces:['i'],acceptance:'ok',budgetMinutes:1})],{encoding:'utf8'});
   assert.notEqual(r.status,0,`${command}: ${r.stdout}`);assert.equal(fs.readFileSync(file,'utf8'),raw);
  }
 } finally {fs.rmSync(p,{recursive:true,force:true})}
});
