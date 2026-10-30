import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const src=(await readFile(new URL('./plugin.js',import.meta.url),'utf8')).replace(/^import .*$/gm,'')
const {createController}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'))
const valid=JSON.stringify({version:1,tasks:[],history:[]})
for (const error of ['not-granted','folder-changed']) test(`${error} clears selection and filter`,async()=>{
 let result={ok:true,text:valid}; let state; const c=createController({readText:async()=>result},v=>state=v)
 await c.select({id:'a'}); c.setFilter('blocked'); result={ok:false,error,message:'secret path'}; await c.refresh()
 assert.equal(state.folder,null); assert.equal(state.data,null); assert.equal(state.filter,'all'); assert.match(state.message,/授权/); assert.doesNotMatch(state.message,/secret/)
})
test('distinguishes JSON damage, unsupported versions, malformed state and API failure without leaking details',async()=>{
 let result; let state; const c=createController({readText:async()=>result},v=>state=v)
 for(const [value,expected] of [[{ok:true,text:'{secret'},/JSON.*损坏/],[{ok:true,text:'{"version":2,"tasks":[],"history":[]}'},/版本不支持/],[{ok:true,text:'{"version":1,"tasks":null,"history":[]}'},/状态.*损坏/],[{ok:false,error:'io-error',message:'secret path'},/读取失败/]]) {
  result=value; await c.select({id:'a'}); assert.match(state.message,expected); assert.doesNotMatch(state.message,/secret/)
 }
})
test('late revoked response cannot clear a newer selection',async()=>{
 let resolve; let state; const c=createController({readText:id=>id==='a'?new Promise(r=>resolve=r):Promise.resolve({ok:true,text:valid})},v=>state=v)
 const old=c.select({id:'a'}); await c.select({id:'b'}); resolve({ok:false,error:'not-granted'}); await old; assert.equal(state.folder.id,'b'); assert.ok(state.data)
})
test('not-granted reports current lack of authorization without claiming revocation',async()=>{
 let state; const c=createController({readText:async()=>({ok:false,error:'not-granted'})},v=>state=v)
 await c.select({id:'a'}); assert.match(state.message,/当前.*无.*授权/); assert.doesNotMatch(state.message,/撤销|曾经|此前/)
})
test('interface explains authorization is checked only on reads, not monitored live',()=>{
 assert.match(src,/最近一次读取时检查/); assert.match(src,/外部撤销.*下一次刷新.*检测/)
})
for(const outcome of ['success','rejection']) test(`same-project refresh ignores stale ${outcome} after newer success`,async()=>{
 const pending=[]; let state; let publications=0
 const c=createController({readText:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))},v=>{state=v;publications++})
 const old=c.select({id:'a'}); const newer=c.refresh()
 pending[1].resolve({ok:true,text:valid}); await newer; c.setFilter('blocked')
 const latest=state, count=publications
 if(outcome==='success') pending[0].resolve({ok:true,text:valid}); else pending[0].reject(new Error('secret old error'))
 await old; assert.equal(publications,count); assert.strictEqual(state,latest); assert.equal(state.folder.id,'a'); assert.ok(state.data); assert.equal(state.filter,'blocked'); assert.equal(state.message,'读取成功')
})
test('exception from prior project cannot overwrite newer project data',async()=>{
 let rejectOld, state, publications=0
 const c=createController({readText:id=>id==='a'?new Promise((resolve,reject)=>rejectOld=reject):Promise.resolve({ok:true,text:valid})},v=>{state=v;publications++})
 const old=c.select({id:'a'}); await c.select({id:'b'}); c.setFilter('blocked')
 const latest=state, count=publications; rejectOld(new Error('secret old error')); await old
 assert.equal(publications,count); assert.strictEqual(state,latest); assert.equal(state.folder.id,'b'); assert.ok(state.data); assert.equal(state.filter,'blocked'); assert.equal(state.message,'读取成功')
})
test('disconnect is explicit and does not release the grant',async()=>{
 let released=0,state;const c=createController({readText:async()=>({ok:true,text:valid}),release:async()=>{released++}},v=>state=v)
 await c.select({id:'a'}); c.clear(); assert.equal(state.folder,null); assert.equal(released,0)
 assert.match(src,/断开视图（不撤销授权）/); assert.match(src,/Folder access|文件夹访问/)
})
