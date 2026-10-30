import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

async function render(view) {
 let src=await readFile(new URL('./plugin.js',import.meta.url),'utf8')
 src=src.replace(/^import .*$/gm,'')
 const pre=`const host={state:{cwd:{}}}; const useValue=()=>'/session'; const useState=(initial)=>[initial && initial.message ? globalThis.__view : initial,v=>{globalThis.__published=v}]; const useMemo=f=>f(); const useEffect=()=>{}; const Button='button'; const jsx=(type,props)=>({type,props}); const jsxs=jsx;\n`
 const mod=await import('data:text/javascript;base64,'+Buffer.from(pre+src+'\nexport {Pane}').toString('base64'))
 globalThis.__view=view
 return mod.Pane({ctx:{files:{}}})
}
function nodes(root) {if(!root || typeof root!=='object') return []; return [root,...(Array.isArray(root.props?.children)?root.props.children:[root.props?.children]).flatMap(nodes)]}
function content(root) {return nodes(root).flatMap(n=>[n.props?.children].flat()).filter(x=>typeof x==='string').join(' ')}
const legacy=JSON.parse(await readFile(new URL('../direct-collab-workbench/fixtures/legacy-synthetic-state.json',import.meta.url),'utf8'))
const task={...legacy.history.find(h=>h.command==='progress').task,coverage:'旧审查范围未知',gates:[{name:'施工',label:'登记进行中',detail:'未核验',tone:'active'}]}
test('五关以语义色、图标和文字共同呈现',async()=>{
 const tones=['registered','active','waiting','problem','unknown']
 const gates=tones.map((tone,i)=>({name:`关${i}`,label:`状态${i}`,detail:'未核验',tone}))
 const tree=await render({folder:{id:'a'},data:{tasks:[{...task,gates}],history:[]},message:'读取成功'})
 const items=nodes(tree).filter(n=>n.props?.['data-gate']); assert.equal(items.length,5)
 const borders=['var(--ui-green)','var(--ui-blue)','var(--ui-yellow)','var(--ui-red)','var(--ui-stroke-secondary)']
 const icons=['✓','●','○','!','?']
 items.forEach((item,i)=>{
  assert.equal(item.props.style?.color,'var(--ui-text-primary)')
  assert.equal(item.props.style?.backgroundColor,'var(--ui-bg-editor)')
  assert.equal(item.props.style?.borderColor,borders[i])
  assert.match(item.props.className,/border/)
  assert.ok(nodes(item).some(n=>n.props?.['aria-hidden']===true && n.props.children===icons[i]))
  assert.match(content(item),new RegExp(`状态${i}`)); assert.match(item.props['aria-label'],new RegExp(`状态${i}`))
 })
 const src=await readFile(new URL('./plugin.js',import.meta.url),'utf8')
 const rendering=src.slice(src.indexOf('function Pane('))
 assert.doesNotMatch(rendering, /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\s*\(/i)
})
test('任务状态中文突出，任务和登记边界可见，历史默认收起',async()=>{
 const tree=await render({folder:{id:'a',path:'项目A'},data:{tasks:[task],history:[{at:'昨天',id:'T1',command:'review'}]},message:'读取成功',updated:'今天'})
 const all=content(tree); assert.match(all,/进行中/); assert.doesNotMatch(all,/T1 · active/); assert.doesNotMatch(all,/修复问题/); assert.match(all,/旧审查范围未知/); assert.match(all,/未核验/)
 const details=nodes(tree).filter(n=>n.type==='details'); assert.ok(details.length); assert.ok(details.every(n=>!n.props.open)); assert.match(all,/同任务轮次历史/)
})
test('状态筛选为可访问的按钮组并标记当前状态',async()=>{
 const tree=await render({folder:{id:'a'},data:{tasks:[task],history:[]},filter:'active',message:'读取成功'})
 const group=nodes(tree).find(n=>n.props?.role==='group' && n.props?.['aria-label']==='任务状态筛选')
 assert.ok(group,'缺少任务状态筛选按钮组')
 const buttons=nodes(group).filter(n=>n.type==='button')
 assert.equal(buttons.length,7)
 assert.equal(buttons.filter(n=>n.props['aria-pressed']).length,1)
 assert.match(content(buttons.find(n=>n.props['aria-pressed'])),/进行中/)
 assert.ok(buttons.every(n=>typeof n.props.onClick==='function'))
 buttons.find(n=>content(n).includes('受阻')).props.onClick()
 assert.equal(globalThis.__published.filter,'blocked')
 assert.ok(!nodes(tree).some(n=>n.type==='select'))
})
test('空态提供项目选择和无任务说明',async()=>{
 const tree=await render({folder:{id:'a',path:'项目A'},data:{tasks:[],history:[]},message:'读取成功',updated:'今天'})
 assert.match(content(tree),/暂无任务/); assert.match(content(tree),/切换项目/)
})
