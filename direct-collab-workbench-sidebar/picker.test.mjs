import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
test('cancelled or obsolete folder picker cannot select a project',async()=>{
 let src=await readFile(new URL('./plugin.js',import.meta.url),'utf8');src=src.replace(/^import .*$/gm,'')
 const {createController}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'))
 let resolve; const events=[]; const files={requestFolder:()=>new Promise(r=>resolve=r),readText:async()=>({ok:true,text:'{"version":1,"tasks":[],"history":[]}'})}
 const c=createController(files,v=>events.push(v)); const p=c.pick(); c.clear(); resolve({ok:true,folder:{id:'old'}});await p
 assert.equal(events.at(-1).folder,null)
})
