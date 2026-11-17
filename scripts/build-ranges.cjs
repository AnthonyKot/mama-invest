const fs=require('node:fs'),E=require('../src/engine.js'),P=require('../src/portfolios.js');
const d=JSON.parse(fs.readFileSync('data/series.json','utf8')),out={schema:2,semantics:'display',variants:{}};
for(const unit of ['eur','usd','bucket'])for(const real of [true,false]){
 const variant=out.variants[`${unit}:${real?'real':'nominal'}`]={};
 for(const p of [P.baseline,...P.presets.filter(p=>['advice','fund'].includes(p.kind))]){
  variant[p.id]={};for(const years of [3,5,10,15,20])variant[p.id][years]=E.ranges(d,p,years,{unit,real});
 }
 console.log(`Built ranges in ${unit}, ${real?'today’s':'dated'} money.`);
}
fs.writeFileSync('data/ranges.json',JSON.stringify(out)+'\n');
fs.writeFileSync('data/ranges.js','globalThis.MAMA_RANGES='+JSON.stringify(out)+';\n');
console.log('Built every-start-month ranges for all six display modes.');
