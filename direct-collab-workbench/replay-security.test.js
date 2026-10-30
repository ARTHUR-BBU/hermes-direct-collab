'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateAndProject}=require('./ledger-core');
const original=require('./fixtures/legacy-synthetic-state.json');
test('new gated submission cannot accept legacy unknown review',()=>{
 const s=structuredClone(original); s.history.find(h=>h.command==='submit').coverageGate=1;
 assert.throws(()=>validateAndProject(s));
});
test('cancel requires a nonempty reason in replay',()=>{
 const create=structuredClone(original.history[0]); const task={...create.task,status:'cancelled'};
 const s={version:1,tasks:[task],history:[create,{at:create.at,command:'cancel',id:task.id,task}]};
 assert.throws(()=>validateAndProject(s));
 task.cancelReason='valid reason'; assert.doesNotThrow(()=>validateAndProject(s));
});
