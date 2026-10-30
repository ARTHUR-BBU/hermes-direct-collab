import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'

async function load() {
  let source
  try { source = await readFile(new URL('./plugin.js', import.meta.url), 'utf8') }
  catch { assert.fail('plugin implementation is missing') }
  source = source.replace(/^import .*$/gm, '')
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
}
const fixture = id => { const s=JSON.parse(readFileSync(new URL('../direct-collab-workbench/fixtures/legacy-synthetic-state.json',import.meta.url),'utf8')); s.tasks[0].id=id; for(const h of s.history) { h.id=id; h.task.id=id } return JSON.stringify(s) }
test('bad JSON and unknown version fail closed', async () => {
  const { parseState } = await load()
  assert.throws(() => parseState('{'))
  assert.throws(() => parseState('{"version":2,"tasks":[],"history":[]}'))
  assert.throws(() => parseState('{"version":1,"tasks":[null],"history":[]}'))
})
test('coverage is declared only and legacy is unknown', async () => {
  const { parseState } = await load()
  const t = parseState(fixture('a')).tasks[0]
  assert.equal(t.coverage, '旧审查范围未知')
  const x = JSON.parse(fixture('a')); x.tasks[0].review.coveredPaths=['a']
  // Mutating only the live snapshot must not manufacture a new review.
  assert.throws(()=>parseState(JSON.stringify(x)))
  x.tasks[0].paths.push('b')
  assert.throws(()=>parseState(JSON.stringify(x)))
})
test('switch clears data and ignores delayed previous reads', async () => {
  const { createController } = await load()
  let resolveA; const events=[]
  const c=createController({readText: id => id==='a' ? new Promise(r=>resolveA=r) : Promise.resolve({ok:true,text:fixture('b')})}, v=>events.push(v))
  const pending=c.select({id:'a',path:'A'}); await c.select({id:'b',path:'B'})
  resolveA({ok:true,text:fixture('a')}); await pending
  assert.equal(events.at(-1).data.tasks[0].id,'b')
  assert.equal(events.find(e=>e.folder?.id==='b').data,null)
})
test('filter follows the authorized project and survives refresh', async () => {
  const { createController } = await load(); const events=[]
  let selected='a'
  const c=createController({readText:async id=>({ok:true,text:fixture(id)}),requestFolder:async()=>({ok:true,folder:{id:selected,path:selected.toUpperCase()}})},v=>events.push(v))
  await c.pick(); c.setFilter('blocked')
  assert.equal(events.at(-1).filter,'blocked')
  await c.refresh(); assert.equal(events.at(-1).filter,'blocked')
  await c.pick(); assert.equal(events.at(-1).filter,'blocked')
  selected='b'; await c.pick(); assert.equal(events.at(-1).filter,'all')
  assert.equal(events.at(-1).data.tasks[0].id,'b')
})
test('errors and disconnect discard old data', async () => {
  const { createController } = await load(); const events=[]
  let result={ok:true,text:fixture('a')}; const c=createController({readText:async()=>result},v=>events.push(v))
  await c.select({id:'a',path:'A'}); result={ok:false,error:'not-granted'}; await c.refresh()
  assert.equal(events.at(-1).data,null); assert.match(events.at(-1).message,/授权/)
  c.clear(); assert.equal(events.at(-1).folder,null)
})
