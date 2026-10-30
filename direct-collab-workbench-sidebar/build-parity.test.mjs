import {tmpdir as requireTempDir} from 'node:os'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp, mkdir, readFile, writeFile, copyFile, rm} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import path from 'node:path'
import {createRequire} from 'node:module'

const require=createRequire(import.meta.url)
const core=require('../direct-collab-workbench/ledger-core.js')
test('generated artifact is reproducible and matches shared core across synthetic legacy transitions and corruption',async()=>{
 const root=await mkdtemp(path.join((process.env.TMPDIR || requireTempDir()),'side-build-'))
 try {
  const sidebar=path.join(root,'direct-collab-workbench-sidebar'),cli=path.join(root,'direct-collab-workbench')
  await mkdir(sidebar); await mkdir(cli)
  await copyFile(new URL('./plugin.js',import.meta.url),path.join(sidebar,'plugin.js'))
  await copyFile(new URL('./build-core.cjs',import.meta.url),path.join(sidebar,'build-core.cjs'))
  await copyFile(new URL('../direct-collab-workbench/ledger-core.js',import.meta.url),path.join(cli,'ledger-core.js'))
  const built=spawnSync(process.execPath,[path.join(sidebar,'build-core.cjs')],{encoding:'utf8'}); assert.equal(built.status,0,built.stderr)
  const artifact=await readFile(path.join(sidebar,'plugin.js'),'utf8'), source=await readFile(new URL('./plugin.js',import.meta.url),'utf8'); assert.equal(artifact,source.replace(/\r\n/g,'\n'))
  const plugin=await import('data:text/javascript;base64,'+Buffer.from(artifact.replace(/^import .*$/gm,'')).toString('base64'))
  const ledger=JSON.parse(await readFile(new URL('../direct-collab-workbench/fixtures/legacy-synthetic-state.json',import.meta.url),'utf8'))
  for(let i=1;i<=ledger.history.length;i++){const history=ledger.history.slice(0,i), state={...ledger,history,tasks:[history.at(-1).task]}; assert.deepEqual(plugin.parseState(JSON.stringify(state)).tasks[0].gates,core.validateAndProject(state).tasks[0].gates)}
  const broken=structuredClone(ledger); broken.history[0].at='invalid'; assert.throws(()=>core.validateAndProject(broken));assert.throws(()=>plugin.parseState(JSON.stringify(broken)))
 } finally {await rm(root,{recursive:true,force:true})}
})
