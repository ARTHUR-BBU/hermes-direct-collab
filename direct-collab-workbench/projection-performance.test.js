'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateAndProject}=require('./ledger-core');
const baseline=require('./fixtures/projection-baseline.json');

test('projection preserves baseline outputs and never mutates CLI or legacy ledgers',()=>{
 for(let i=0;i<baseline.cases.length;i++) {
  const state=structuredClone(baseline.cases[i]), before=JSON.stringify(state);
  assert.deepEqual(validateAndProject(state),baseline.expected[i]);
  assert.deepEqual(validateAndProject(state),baseline.expected[i]);
  assert.equal(JSON.stringify(state),before);
 }
 for(let i=0;i<baseline.corrupt.length;i++) {
  const state=structuredClone(baseline.corrupt[i]),before=JSON.stringify(state);
  assert.throws(()=>validateAndProject(state),e=>e.message===baseline.errors[i]);
  assert.equal(JSON.stringify(state),before);
 }
});

test('projection does not repeatedly filter the complete history per task',()=>{
 const state=structuredClone(baseline.cases[0]);
 Object.defineProperty(state.history,'filter',{value(){throw Error('full history filter forbidden')},configurable:true});
 assert.deepEqual(validateAndProject(state),baseline.expected[0]);
});
