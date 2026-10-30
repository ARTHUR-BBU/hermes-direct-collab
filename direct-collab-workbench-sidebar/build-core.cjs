'use strict';
// Regenerate the embedded pure core; the plugin has no runtime filesystem dependency.
const fs=require('node:fs');
const path=require('node:path');
const core=fs.readFileSync(path.join(__dirname,'../direct-collab-workbench/ledger-core.js'),'utf8').replace(/\r\n/g,'\n');
const target=path.join(__dirname,'plugin.js');
let plugin=fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n');
const begin='// BEGIN GENERATED LEDGER CORE';
const end='// END GENERATED LEDGER CORE';
const generated=`${begin}\nconst ledgerCore=(()=>{const module={exports:{}};\n${core}\nreturn module.exports;})();\n${end}`;
if(plugin.includes(begin)) {
 const a=plugin.indexOf(begin), b=plugin.indexOf(end,a);
 if(b<0) throw Error('missing generated core end');
 plugin=plugin.slice(0,a)+generated+plugin.slice(b+end.length);
} else {
 const a=plugin.indexOf('export function parseState'), b=plugin.indexOf('export function createController');
 if(a<0||b<0) throw Error('missing plugin markers');
 const adapter=`${generated}\nexport function parseState(raw) {\n const s=JSON.parse(raw);\n const result=ledgerCore.validateAndProject(s);\n return {...result,tasks:result.tasks.map(t=>({...t,coverage:({none:'未记录','legacy-unknown':'旧审查范围未知',partial:'部分（登记声明）',full:'完整（登记声明）'})[t.coverage]}))};\n}\nexport function deriveGates(t) { return t.gates; }\n`;
 plugin=plugin.slice(0,a)+adapter+plugin.slice(b);
}
fs.writeFileSync(target,plugin);
