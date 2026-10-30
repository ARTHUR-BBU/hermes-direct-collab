const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'); const os=require('node:os'); const path=require('node:path'); const {spawnSync}=require('node:child_process');
const cli=path.join(__dirname,'cli.js');
function run(p,c,d={}) { return spawnSync(process.execPath,[cli,c,'--project',p,'--json',JSON.stringify(d)],{encoding:'utf8'}); }
function setup(){const p=fs.mkdtempSync(path.join(os.tmpdir(),'collab-red-'));fs.writeFileSync(path.join(p,'file.txt'),'data');assert.equal(run(p,'init').status,0);return p;}
const task={goal:'test',owner:'A',paths:['file.txt'],interfaces:['CLI'],acceptance:'ok',budgetMinutes:1};
test('Windows case aliases cannot both start',()=>{const p=setup();assert.equal(run(p,'create',{...task,id:'a'}).status,0);assert.equal(run(p,'start',{id:'a'}).status,0);assert.equal(run(p,'create',{...task,id:'b',paths:['FILE.TXT']}).status,0);assert.notEqual(run(p,'start',{id:'b'}).status,0);});
test('hardlink aliases cannot both start',()=>{const p=setup();fs.linkSync(path.join(p,'file.txt'),path.join(p,'alias.txt'));assert.equal(run(p,'create',{...task,id:'a'}).status,0);assert.equal(run(p,'start',{id:'a'}).status,0);assert.equal(run(p,'create',{...task,id:'b',paths:['alias.txt']}).status,0);assert.notEqual(run(p,'start',{id:'b'}).status,0);});
test('internal directory is protected regardless of case',()=>{const p=setup();assert.notEqual(run(p,'create',{...task,id:'a',paths:['.COLLAB/state.json']}).status,0);});
test('structurally corrupt task fails closed on status and handoff',()=>{const p=setup();fs.writeFileSync(path.join(p,'.collab','state.json'),JSON.stringify({version:1,tasks:[{id:'broken',paths:[],status:'draft'}],history:[]}));for(const c of ['status','handoff']){const r=run(p,c);assert.notEqual(r.status,0,c);assert.match(JSON.parse(r.stdout).error,/state|状态/i);}});
