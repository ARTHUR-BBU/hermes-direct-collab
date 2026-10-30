'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('shared pure projection preserves synthetic legacy acceptance as historical unknown',()=>{
 const {validateAndProject}=require('./ledger-core');
 const state=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/legacy-synthetic-state.json'),'utf8'));
 const before=JSON.stringify(state);
 const projected=validateAndProject(state);
 assert.equal(JSON.stringify(state),before);
 assert.equal(projected.tasks[0].coverage,'legacy-unknown');
 assert.equal(projected.tasks[0].gates.length,5);
 assert.match(projected.tasks[0].gates[4].label,/登记验收/);
});
test('duplicate registered paths fail closed even in replayed history',()=>{
 const {validateAndProject}=require('./ledger-core');
 const s=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/legacy-synthetic-state.json'),'utf8'));
 for(const t of [s.tasks[0],...s.history.map(h=>h.task)]) t.paths.push(t.paths[0]);
 assert.throws(()=>validateAndProject(s));
});
