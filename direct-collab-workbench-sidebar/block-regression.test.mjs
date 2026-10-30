import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
async function load(){let src=await readFile(new URL('./plugin.js',import.meta.url),'utf8');src=src.replace(/^import .*$/gm,'');const pre=`const host={state:{cwd:{}}}; const useValue=()=>'/session'; const useState=x=>[x && x.message ? globalThis.__view : x,()=>{}]; const useMemo=f=>f(); const useEffect=()=>{}; const Button='button'; const jsx=(type,props)=>({type,props}); const jsxs=jsx;\n`;return import('data:text/javascript;base64,'+Buffer.from(pre+src+'\nexport {Pane}').toString('base64'))}
const base={id:'task-A',goal:'g',owner:'o',paths:['a','b'],interfaces:['i'],acceptance:'x',status:'review'}
const state=(t,commands)=>JSON.stringify({version:1,tasks:[t],history:commands.map(command=>({id:t.id,command,at:'time'}))})
const rejects=async(t,h)=>{const m=await load();assert.throws(()=>m.parseState(state(t,h)),/状态/)}
test('draft with start cannot claim work never started',async()=>{await rejects({...base,status:'draft'},['start'])})
test('active without start cannot assert work in progress',async()=>{await rejects({...base,status:'active'},[])})
test('old fail without current review history is unknown',async()=>{await rejects({...base,review:{result:'fail',coveredPaths:['a']}},[])})
test('accepted partial coverage explicitly contradicts acceptance',async()=>{await rejects({...base,status:'accepted',review:{result:'pass',coveredPaths:['a']}},['start','submit','review'])})
test('review without evidence or snapshot cannot be registered pass',async()=>{await rejects({...base,review:{result:'pass',coveredPaths:['a','b']}},['start','submit','review'])})
test('cards show constrained task ids and hide invalid ids',async()=>{const m=await load();let raw=JSON.parse(await readFile(new URL('../direct-collab-workbench/fixtures/legacy-synthetic-state.json',import.meta.url),'utf8'));let data=m.parseState(JSON.stringify(raw));globalThis.__view={folder:{id:'x'},data,message:'ok'};assert.match(JSON.stringify(m.Pane({ctx:{files:{}}})),/legacy/);raw.tasks[0].id='bad secret';for(const h of raw.history){h.id='bad secret';h.task.id='bad secret'}assert.throws(()=>m.parseState(JSON.stringify(raw)))})
