'use strict';
// Rebuild synthetic fixtures solely from literal inputs and the local CLI.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {validateAndProject} = require('../ledger-core');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-synthetic-'));
const cli = path.join(__dirname, '..', 'cli.js');
function run(command, data = {}) {
  const result = spawnSync(process.execPath, [cli, command, '--project', root, '--json', JSON.stringify(data)], {encoding: 'utf8'});
  if (result.status !== 0) throw Error(`${command}: ${result.stdout} ${result.stderr}`);
}
try {
  for (const [name, text] of [['artifact.txt','artifact'], ['review.txt','review'], ['verify.txt','verify']]) fs.writeFileSync(path.join(root,name), text);
  const id='legacy';
  for (const [command,data] of [
    ['init',{}], ['create',{id,goal:'synthetic task',owner:'owner',paths:['artifact.txt'],interfaces:['CLI'],acceptance:'ok',budgetMinutes:5}],
    ['start',{id}], ['progress',{id,evidence:'synthetic progress',next:'synthetic next'}], ['submit',{id}],
    ['block',{id,reason:'synthetic block'}], ['resume',{id}],
    ['review',{id,reviewer:'reviewer',result:'pass',evidence:'review.txt',coveredPaths:['artifact.txt']}],
    ['accept',{id,evidence:'verify.txt'}]
  ]) run(command,data);
  const state = JSON.parse(fs.readFileSync(path.join(root,'.collab','state.json'),'utf8'));
  // Model an accepted pre-coverage ledger; fixed timestamps make regeneration deterministic.
  function normalize(value) {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === 'object') {
      const out = {};
      for (const [key,v] of Object.entries(value)) {
        if (key === 'coverageGate' || key === 'coveredPaths') continue;
        out[key] = typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) ? '2020-01-01T00:00:00.000Z' : normalize(v);
      }
      return out;
    }
    return value;
  }
  const legacy = normalize(state);
  const empty = {version:1,tasks:[],history:[]};
  const corruptTime = structuredClone(legacy); corruptTime.history[0].at = 'invalid';
  const corruptId = structuredClone(legacy); corruptId.history[0].task.id = 'invalid id';
  const cases = [legacy,empty], corrupt = [corruptTime,corruptId];
  const errors = corrupt.map(s => { try { validateAndProject(s); throw Error('corruption accepted'); } catch(e) { if (e.message === 'corruption accepted') throw e; return e.message; } });
  const baseline = {cases,expected:cases.map(validateAndProject),corrupt,errors};
  const json = obj => JSON.stringify(obj,null,2)+'\n';
  fs.writeFileSync(path.join(__dirname,'legacy-synthetic-state.json'),json(legacy));
  fs.writeFileSync(path.join(__dirname,'projection-baseline.json'),json(baseline));
  fs.writeFileSync(path.join(__dirname,'calculator-index.html'),'<!doctype html>\n<title>Invented test document</title>\n<p>Fixture content only.</p>\n');
} finally { fs.rmSync(root,{recursive:true,force:true}); }
