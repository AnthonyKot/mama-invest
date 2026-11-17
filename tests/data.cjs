const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const E=require('../src/engine.js'),P=require('../src/portfolios.js');
const D=JSON.parse(fs.readFileSync('data/series.json','utf8'));
test('all compiled assets are finite positive and gapless',()=>{
 for(const [key,a] of Object.entries(D.assets))for(const m of E.months(a.start,D.end))assert.ok(Number.isFinite(a.values[m])&&a.values[m]>0,`${key} ${m}`);
});
test('scenario lists exclude later assets and restrict Bitcoin and single stocks',()=>{
 for(const s of ['1999-01','2007-07','2017-12']){
  const keys=P.availableAssets(D,s);
  assert.equal(keys.includes('btc'),s==='2017-12');
  for(const k of keys)assert.ok(D.assets[k].start<=s);
  if(s!=='2017-12')assert.ok(!keys.includes('meta'));
  for(const p of P.availablePresets(D,s)){assert.ok(p.published<=s);for(const k of Object.keys(p.weights))assert.ok(keys.includes(k))}
 }
});
test('all offered presets and baseline simulate in each display unit',()=>{
 for(const start of ['1999-01','2007-07','2017-12'])for(const p of [P.baseline,...P.availablePresets(D,start)])for(const unit of ['usd','eur','bucket']){
  const r=E.simulate(D,{start,weights:p.weights,unit});
  assert.ok(Number.isFinite(r.final.displayAfterTax));
  assert.ok(r.final.tax>=0);
  assert.equal(r.payments.length,Math.floor((E.monthNumber(D.end)-E.monthNumber(start))/6)+1);
 }
});
test('eleven labelled approximations preserve raw CPI gap',()=>{
 assert.equal(D.approximations.length,11);
 assert.equal(D.macro.euro_hicp['2026-10'],D.macro.euro_hicp['2026-09']);
 assert.ok(!fs.readFileSync('data/raw/euro_hicp.csv','utf8').includes('2026-10-01'));
 assert.ok(Math.abs(D.macro.us_cpi['2025-10']-Math.sqrt(324.8*324.122))<1e-10);
 assert.ok(!fs.readFileSync('data/raw/us_cpi.csv','utf8').includes('2025-10-01,324.460'));
});
test('static assets exist and the page has no remote runtime dependencies',()=>{
 const html=fs.readFileSync('index.html','utf8');
 for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){assert.ok(!/^https?:/.test(match[1]));assert.ok(fs.existsSync(match[1]))}
 assert.ok(!/\bfetch\s*\(|XMLHttpRequest/.test(fs.readFileSync('src/app.js','utf8')));
});
test('cached range multiples are independent of contribution amount',()=>{
 const p=P.presets.find(p=>p.id==='weather');
 const cache=JSON.parse(fs.readFileSync('data/ranges.json','utf8')).variants['eur:real'][p.id][3];
 const r=E.simulate(D,{start:cache.worst.start,end:E.addMonths(cache.worst.start,36),weights:p.weights,contribution:3000});
 assert.ok(Math.abs(r.final.multiple-cache.worst.multiple)<1e-10);
});
test('1999 displayed multiples match adjacent amounts and deposits are flagged',()=>{
 const classic=P.presets.find(p=>p.id==='classic');
 for(const unit of ['eur','usd','bucket'])for(const real of [true,false]){
  const r=E.simulate(D,{start:'1999-01',weights:classic.weights,unit,real});
  for(const row of r.rows){
   assert.ok(Math.abs(row.multiple-row.displayAfterTax/row.displayIn)<1e-12);
   assert.ok(Math.abs(row.ratio-row.displayValue/row.displayIn)<1e-12);
  }
 }
 const r=E.simulate(D,{start:'1999-01',weights:P.baseline.weights,unit:'bucket',real:true});
 assert.ok(r.final.multiple<1);assert.ok(r.final.nominalMultiple>1);
 assert.equal(r.final.afterTaxBelowMoneyIn,true);assert.ok(r.underwater>0);
});
test('each scenario offers an actual globally diversified fund and a favourites basket',()=>{
 for(const [start,fund,basket] of [['1999-01','lifestrategy','favourites99'],['2007-07','target2050','favourites07'],['2017-12','world','favourites17']]){
  const available=P.availablePresets(D,start);
  assert.ok(available.filter(p=>p.kind==='advice').length>=3);
  assert.ok(available.find(p=>p.id===fund)?.isFund);
  assert.equal(available.find(p=>p.id===fund)?.kind,'advice');
  const favourites=available.find(p=>p.id===basket);
  assert.equal(favourites.kind,'fashion');assert.deepEqual(Object.values(favourites.weights),[.2,.2,.2,.2,.2]);
 }
 const swensen=P.availablePresets(D,'2007-07').find(p=>p.id==='swensen');
 assert.equal(swensen.weights.developed_stocks,.15);
 assert.equal(swensen.weights.us_intermediate_treasuries,.15);
 assert.ok(D.assets.developed_stocks.start<='2007-07');
 assert.ok(!P.availableAssets(D,'1999-01').includes('global_stocks_fund'));
});
test('one-fund returns use actual fund observations, without synthetic blends',()=>{
 for(const key of ['lifestrategy_growth','target_retirement_2050','global_stocks_fund','developed_stocks']){
  const raw=JSON.parse(fs.readFileSync(`data/raw/${key}.json`,'utf8')).chart.result[0];
  const monthly={};raw.timestamp.forEach((t,i)=>{
   const m=new Date(t*1000).toISOString().slice(0,7),p=raw.indicators.adjclose[0].adjclose[i];
   if(p!=null&&m<=D.end)monthly[m]=p;
  });
  const a=D.assets[key];
  assert.ok(Math.abs(a.values[D.end]/a.values[a.start]-monthly[D.end]/monthly[a.start])<1e-9);
 }
});
test('all six range variants match directly simulated displayed amounts',()=>{
 const cache=JSON.parse(fs.readFileSync('data/ranges.json','utf8'));
 assert.equal(cache.schema,2);
 for(const unit of ['eur','usd','bucket'])for(const real of [true,false]){
  const variant=cache.variants[`${unit}:${real?'real':'nominal'}`];
  for(const p of [P.baseline,...P.presets.filter(p=>['advice','fund'].includes(p.kind))]){
   const range=variant[p.id][3];if(range.count<12)continue;
   const r=E.simulate(D,{start:range.worst.start,end:E.addMonths(range.worst.start,36),weights:p.weights,unit,real});
   assert.ok(Math.abs(range.worst.multiple-r.final.displayAfterTax/r.final.displayIn)<1e-10,`${unit} ${real} ${p.id}`);
  }
 }
});
