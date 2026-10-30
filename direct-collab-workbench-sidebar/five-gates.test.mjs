import {tmpdir as requireTempDir} from 'node:os'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile, mkdtemp, writeFile, rm} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

async function load() {
 let src=await readFile(new URL('./plugin.js',import.meta.url),'utf8')
 src=src.replace(/^import .*$/gm,'')
 const pre=`const host={state:{cwd:{}}}; const useValue=()=>'/session'; const useState=x=>[x && x.message ? globalThis.__view : x,()=>{}]; const useMemo=f=>f(); const useEffect=()=>{}; const Button='button'; const jsx=(type,props)=>({type,props}); const jsxs=jsx;\n`
 return import('data:text/javascript;base64,'+Buffer.from(pre+src+'\nexport {Pane}').toString('base64'))
}
const base={id:'T',goal:'目标',owner:'甲',paths:['a','b'],interfaces:['接口'],acceptance:'验收',status:'draft'}
const h=command=>({id:'T',command,at:'time'})
const state=(task,history=[])=>JSON.stringify({version:1,tasks:[task],history})
const labels=g=>g.map(x=>x.label)
const legacy=JSON.parse(await readFile(new URL('../direct-collab-workbench/fixtures/legacy-synthetic-state.json',import.meta.url),'utf8'))
const historical=command=>{const i=legacy.history.findIndex(x=>x.command===command);const history=legacy.history.slice(0,i+1);return JSON.stringify({...legacy,tasks:[history.at(-1).task],history})}
function nodes(x) {if(!x || typeof x!=='object')return []; return [x,...(Array.isArray(x.props?.children)?x.props.children:[x.props?.children]).flatMap(nodes)]}
function content(x){return nodes(x).flatMap(n=>[n.props?.children].flat()).filter(x=>typeof x==='string').join(' ')}
test('five gates derive only registered facts and retain long history',async()=>{
 const {parseState,deriveGates}=await load()
 let t=parseState(historical('progress')).tasks[0]
 let g=deriveGates(t); assert.equal(g.length,5); assert.deepEqual(g.map(x=>x.name),['立项','派工','施工','审片','交片']); assert.match(labels(g).join(' '),/已登记启动/); assert.match(g[2].label,/登记进行中/); assert.match(g[4].label,/未验收/)
 t=parseState(historical('submit')).tasks[0]; g=deriveGates(t); assert.match(g[2].label,/已登记送审/); assert.match(g[3].label,/待审/)
 t=parseState(historical('accept')).tasks[0]; g=deriveGates(t); assert.match(g[4].label,/登记验收/); assert.match(g[4].detail,/未核验/)
 assert.throws(()=>parseState(state({...base,status:'active'},[h('start'),...Array.from({length:8},()=>h('progress'))])))
 assert.throws(()=>parseState(state({...base,status:'review'},[h('start'),h('submit')])))
 assert.throws(()=>parseState(state({...base,status:'accepted'},[])))
})
test('real CLI review records distinguish fail, partial and full registration',async()=>{
 const {parseState,deriveGates}=await load()
 const root=await mkdtemp(path.join((process.env.TMPDIR || requireTempDir()),'sidebar-gates-'))
 const cli=fileURLToPath(new URL('../direct-collab-workbench/cli.js',import.meta.url))
 const run=(command,data={})=>{const p=spawnSync(process.execPath,[cli,command,'--project',root,'--json',JSON.stringify(data)],{encoding:'utf8'}); assert.equal(p.status,0,`${command}: ${p.stdout} ${p.stderr}`)}
 try {
  for(const f of ['a','b','evidence']) await writeFile(path.join(root,f),f)
  for(const [command,data] of [['init',{}],['create',{...base,budgetMinutes:15}],['start',{id:'T'}],['submit',{id:'T'}]]) run(command,data)
  for(const [result,coveredPaths,expected] of [['fail',['a'],/未通过/],['pass',['a'],/范围不足/],['pass',['a','b'],/登记通过/]]) {
   run('review',{id:'T',reviewer:'乙',result,evidence:'evidence',coveredPaths})
   const raw=await readFile(path.join(root,'.collab','state.json'),'utf8')
   const t=parseState(raw).tasks[0], gate=deriveGates(t)[3]
   assert.match(gate.label,expected); assert.match(gate.detail,/未核验/)
   if(result==='pass' && coveredPaths.length===1) {globalThis.__view={folder:{id:'a'},data:parseState(raw),message:'读取成功'};const all=content((await load()).Pane({ctx:{files:{}}}));assert.match(all,/范围不足/);assert.doesNotMatch(all,/审查结论（登记）\s*：\s*通过/)}
   if(result==='pass' && coveredPaths.length===2) {
    for(const key of ['evidence','evidenceHash','snapshot','reviewer','at']) {
     const broken=JSON.parse(raw); delete broken.tasks[0].review[key]
     assert.throws(()=>parseState(JSON.stringify(broken)),undefined,key)
    }
    const broken=JSON.parse(raw); delete broken.history.find(x=>x.command==='submit').coverageGate
    assert.match(deriveGates(parseState(JSON.stringify(broken)).tasks[0])[3].label,/未知/)
   }
  }
 } finally {await rm(root,{recursive:true,force:true})}
})
test('real CLI blocked, reworked and cancelled lifecycles render all five gate labels',async()=>{
 const {parseState,deriveGates}=await load()
 const root=await mkdtemp(path.join((process.env.TMPDIR || requireTempDir()),'sidebar-lifecycle-'))
 const cli=fileURLToPath(new URL('../direct-collab-workbench/cli.js',import.meta.url))
 const run=(command,data={})=>{const p=spawnSync(process.execPath,[cli,command,'--project',root,'--json',JSON.stringify(data)],{encoding:'utf8'});assert.equal(p.status,0,`${command}: ${p.stdout} ${p.stderr}`)}
 const check=async(status,expected)=>{const raw=await readFile(path.join(root,'.collab','state.json'),'utf8');const t=parseState(raw).tasks[0];assert.equal(t.status,status);const gates=deriveGates(t);assert.deepEqual(gates.map(g=>g.name),['立项','派工','施工','审片','交片']);assert.deepEqual(labels(gates),expected)}
 try {
  for(const f of ['a','b','evidence']) await writeFile(path.join(root,f),f)
  for(const [command,data] of [['init',{}],['create',{...base,budgetMinutes:15}],['start',{id:'T'}],['block',{id:'T',reason:'wait'}]]) run(command,data)
  await check('blocked',['已登记','已登记启动','受阻','待审','未验收'])
  for(const [command,data] of [['resume',{id:'T'}],['submit',{id:'T'}],['review',{id:'T',reviewer:'乙',result:'fail',evidence:'evidence',coveredPaths:['a','b']}],['rework',{id:'T',reason:'fix'}]]) run(command,data)
  await check('active',['已登记','已登记启动','登记进行中','待审','未验收'])
  run('cancel',{id:'T',reason:'stop'})
  await check('cancelled',['已登记','启动记录未知','已取消','待审','已取消'])
 } finally {await rm(root,{recursive:true,force:true})}
})
test('malformed lifecycle and missing fields do not produce false completion',async()=>{
 const {parseState,deriveGates}=await load()
 for(const [task,history,index,expected] of [[{...base,status:'blocked'},[h('block')],2,/受阻/],[{...base,status:'cancelled'},[h('cancel')],4,/取消/],[{...base,status:'active'},[h('start'),h('submit'),h('rework')],2,/进行中/],[{...base,interfaces:[],acceptance:''},[],0,/待/],[{...base,status:'review'},[],2,/未知/]]){
  assert.throws(()=>parseState(state(task,history)))
 }
 assert.match(deriveGates(parseState(historical('block')).tasks[0])[2].label,/受阻/)
})
test('contradictory and obsolete history never promotes a gate',async()=>{
 const {parseState,deriveGates}=await load()
 assert.throws(()=>parseState(state({...base,status:'draft'},[h('start')])))
 assert.throws(()=>parseState(state({...base,status:'accepted',review:{result:'pass',coveredPaths:['a','b']}},[h('start'),h('submit'),h('review'),h('rework')])))
 assert.throws(()=>parseState(state({...base,status:'review'},[h('submit')])))
})
test('redacted synthetic legacy ledger parses and renders explicit unknowns',async()=>{
 const mod=await load(); const raw=await readFile(new URL('../direct-collab-workbench/fixtures/legacy-synthetic-state.json',import.meta.url),'utf8'); const parsed=mod.parseState(raw)
 assert.equal(parsed.tasks.length,1); const t=parsed.tasks[0]; assert.equal(t.id,'legacy'); assert.equal(t.status,'accepted'); assert.equal(t.coverage,'旧审查范围未知'); assert.deepEqual(JSON.parse(raw).history.map(h=>h.command),['create','start','progress','submit','block','resume','review','accept'])
 const gates=mod.deriveGates(t); assert.match(gates[3].label,/未知/); assert.equal(gates[3].tone,'unknown'); assert.match(gates[4].label,/登记验收/); assert.equal(gates[4].tone,'unknown')
 globalThis.__view={folder:{id:'legacy'},data:parsed,message:'读取成功'}; const all=content(mod.Pane({ctx:{files:{}}})); assert.match(all,/旧审查范围未知/); assert.match(all,/审查轮次或证据未知/); assert.match(all,/未核验/)
})
test('contradictory acceptance and incomplete history are not completion colored',async()=>{
 const {parseState,deriveGates}=await load()
 for(const history of [[],[h('submit'),h('review'),h('rework')],[h('start'),h('submit'),h('review'),h('cancel')]]) {
  assert.throws(()=>parseState(state({...base,status:'accepted',review:{result:'pass',coveredPaths:['a','b']}},history)))
 }
})
test('duplicate ids fail closed and invalid path boundaries cannot be complete',async()=>{
 const {parseState}=await load(); assert.throws(()=>parseState(JSON.stringify({version:1,tasks:[base,base],history:[]})))
 for(const paths of [['a','a'],['a','']]) assert.throws(()=>parseState(state({...base,paths,review:{result:'pass',coveredPaths:['a']}})))
 assert.throws(()=>parseState(state({...base,paths:[],review:{result:'pass',coveredPaths:['a']}})))
})
test('old cancelled and reworked review is not presented as current or unrecorded',async()=>{
 const {parseState,deriveGates}=await load()
 for(const [status,history] of [['review',['start','submit','review','cancel']],['active',['start','submit','review','rework']],['cancelled',['start','submit','review','cancel']]]) {
 assert.throws(()=>parseState(state({...base,status,review:{result:'pass',coveredPaths:['a','b']}},history.map(h))))
 }
})
test('partial review card hides raw pass and free text by default',async()=>{
 const mod=await load(); assert.throws(()=>mod.parseState(state({...base,goal:'secret-goal',blockReason:'secret-block',status:'review',review:{result:'pass',coveredPaths:['a']}},[h('start'),h('submit'),h('review')]))); const data=mod.parseState(historical('block'))
 globalThis.__view={folder:{id:'a'},data,message:'读取成功'}; const tree=mod.Pane({ctx:{files:{}}}); const all=content(tree); assert.doesNotMatch(all,/审查结论（登记）\s*：\s*通过/); assert.doesNotMatch(all,/secret-goal|secret-block/)
 const gates=nodes(tree).filter(n=>n.props?.['data-gate']); assert.ok(gates.every(n=>!String(n.props.className).includes('--ui-danger') && !String(n.props.className).includes('--ui-text-quaternary')))
})
test('collapsed summary exposes five separate semantic markers and an operation label',async()=>{
 const mod=await load(); const data=mod.parseState(historical('block'))
 globalThis.__view={folder:{id:'a'},data,message:'读取成功'}
 const tree=mod.Pane({ctx:{files:{}}}), summary=nodes(tree).find(n=>n.type==='summary' && content(n).includes('五关'))
 assert.ok(summary); assert.match(content(summary),/查看五关详情/)
 const markers=nodes(summary).filter(n=>n.props?.['data-gate-summary'])
 assert.equal(markers.length,5)
 for(const marker of markers) {assert.ok(marker.props.style?.borderColor); assert.match(content(marker),/立项|派工|施工|审片|交片/); assert.ok(content(marker).length>3)}
 assert.match(content(summary),/受阻/)
})
test('rendered cards expose text, semantic theme colors and native details',async()=>{
 const mod=await load(); assert.throws(()=>mod.parseState(state({...base,status:'blocked'},[h('start'),h('block')]))); const data=mod.parseState(historical('block'))
 globalThis.__view={folder:{id:'a'},data,message:'读取成功'}
 const tree=mod.Pane({ctx:{files:{}}}), all=content(tree); for(const word of ['立项','派工','施工','审片','交片','受阻']) assert.match(all,new RegExp(word))
 const gates=nodes(tree).filter(n=>n.props?.['data-gate']); assert.equal(gates.length,5); assert.ok(gates.every(n=>n.props['aria-label'] && n.props.style?.color && n.props.style?.backgroundColor))
 assert.ok(nodes(tree).some(n=>n.type==='details' && !n.props.open)); assert.match(all,/未核验/); assert.match(all,/自由文本可能含敏感信息/); assert.match(all,/不展示审查及验收证据路径/)
})
