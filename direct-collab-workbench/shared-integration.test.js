'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('CLI and self-contained sidebar consume one generated ledger core',()=>{
 const cli=fs.readFileSync(path.join(__dirname,'cli.js'),'utf8');
 const sidebar=fs.readFileSync(path.join(__dirname,'../direct-collab-workbench-sidebar/plugin.js'),'utf8');
 assert.match(cli,/require\(['"]\.\/ledger-core['"]\)/);
 assert.match(sidebar,/BEGIN GENERATED LEDGER CORE/);
 assert.match(sidebar,/validateAndProject\(s\)/);
});
