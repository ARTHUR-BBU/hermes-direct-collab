const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const cli = path.join(__dirname, 'cli.js');

test('CLI derives current guidance from lifecycle while preserving historical progress', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'next-step-'));
  const id = 't1', original = 'Submit snapshot for independent review';
  const run = (cmd, data = {}) => {
    const r = spawnSync(process.execPath, [cli, cmd, '--project', p, '--json', JSON.stringify(data)], {encoding:'utf8'});
    assert.equal(r.status, 0, `${cmd}: ${r.stdout} ${r.stderr}`);
    return JSON.parse(r.stdout);
  };
  const check = (status, nextPattern, hasProgress = true, stale = false) => {
    const t = run('status').tasks[0], text = run('handoff').markdown;
    assert.equal(t.status, status); assert.equal(t.stale, stale);
    assert.match(t.currentNext, nextPattern);
    assert.match(text, new RegExp(`当前建议：${t.currentNext}`));
    assert.doesNotMatch(t.currentNext, /Submit snapshot for independent review/);
    if (hasProgress) {
      assert.equal(t.progress.next, original);
      assert.ok(text.includes('历史下一步（当时记录）：Submit snapshot for independent review'));
      assert.equal(t.progressIsHistorical, true);
    }
  };
  try {
    for (const [f, content] of [['code.txt','one'],['review.txt','review'],['verify.txt','verify']]) fs.writeFileSync(path.join(p,f),content);
    run('init'); run('create',{id,goal:'goal',owner:'owner-example',paths:['code.txt'],interfaces:['CLI'],acceptance:'ok',budgetMinutes:1});
    check('draft',/启动/,false);
    run('start',{id}); run('progress',{id,evidence:'old evidence',next:original}); check('active',/核对/);
    run('block',{id,reason:'waiting'}); check('blocked',/阻塞/); run('resume',{id}); check('active',/核对/);
    run('submit',{id}); check('review',/审查/);
    run('block',{id,reason:'review waiting'}); check('blocked',/阻塞/); run('resume',{id}); check('review',/审查/);
    run('review',{id,coveredPaths:['code.txt'],reviewer:'reviewer-example',result:'fail',evidence:'review.txt'}); check('review',/修正/);
    run('submit',{id}); check('review',/审查/);
    run('review',{id,coveredPaths:['code.txt'],reviewer:'reviewer-example',result:'pass',evidence:'review.txt'}); check('review',/验收/);
    fs.appendFileSync(path.join(p,'code.txt'),' changed'); check('review',/重新提交/,true,true);
    run('submit',{id}); check('review',/审查/);
    run('review',{id,coveredPaths:['code.txt'],reviewer:'reviewer-example',result:'pass',evidence:'review.txt'}); run('accept',{id,evidence:'verify.txt'}); check('accepted',/无需/,true,false);
    fs.appendFileSync(path.join(p,'verify.txt'),' changed'); check('accepted',/失效/,true,true);
    // A separate cancelled task must not revive its old next action.
    run('create',{id:'t2',goal:'goal',owner:'owner-example',paths:['other.txt'],interfaces:['CLI'],acceptance:'ok',budgetMinutes:1});
    run('start',{id:'t2'}); run('progress',{id:'t2',evidence:'e',next:original}); run('cancel',{id:'t2',reason:'cancelled'});
    const t = run('status').tasks[1], text = run('handoff').markdown;
    assert.equal(t.status,'cancelled'); assert.match(t.currentNext,/取消/); assert.equal(t.progress.next,original); assert.equal(t.progressIsHistorical,true);
    assert.ok(text.includes('历史下一步（当时记录）：Submit snapshot for independent review'));
  } finally { fs.rmSync(p,{recursive:true,force:true}); }
});
