const {test} = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const close = (a,b) => assert.ok(Math.abs(a-b) < 1e-7, `${a} != ${b}`);
function fixture(n=120) {
 const dates=E.months('1999-01',E.addMonths('1999-01',n));
 const values=v=>Object.fromEntries(dates.map(m=>[m,v]));
 return {start:dates[0],end:dates.at(-1),assets:{a:{start:dates[0],values:values(100)},b:{start:dates[0],values:values(100)}},macro:{euro_hicp:values(100),us_cpi:values(100),gbpusd:values(1.5),eurusd:values(1.2)}};
}
const run=(d,options={})=>E.simulate(d,{start:d.start,weights:{a:1},unit:'usd',...options});
test('EUR purchasing power uses HICP independently of contribution CPI',()=>{
 const d=fixture(1);d.macro.us_cpi[d.end]=200;d.macro.euro_hicp[d.end]=125;
 const euro=run(d,{unit:'eur'}),dollar=run(d);
 close(euro.payments[0].amount,750);close(euro.final.multiple,.8);close(dollar.final.multiple,.5);
 close(euro.final.displayIn,750/1.2*1.25);
 delete d.macro.euro_hicp;assert.throws(()=>run(d,{unit:'eur'}),/inflation index/);
});
test('underwater months and worst moment use after-tax displayed value',()=>{
 const d=fixture(1);d.assets.a.values[d.end]=110;d.macro.eurusd[d.start]=1;d.macro.eurusd[d.end]=1.09;
 const r=run(d,{unit:'eur',real:false});
 assert.ok(r.final.displayValue>r.final.displayIn);assert.ok(r.final.displayAfterTax<r.final.displayIn);
 assert.equal(r.underwater,1);assert.equal(r.worst.month,d.end);assert.equal(r.recovery,null);
});
test('flat prices preserve every contribution and zero tax',()=>{for(const r of run(fixture()).rows){close(r.value,r.invested);close(r.tax,0);close(r.multiple,1)}});
test('one contribution doubles, with tax only on gain',()=>{const d=fixture(1);d.assets.a.values[d.end]=200;const r=run(d).final;close(r.value,3000);close(r.afterTax,2655)});
test('losses produce no negative tax',()=>{const d=fixture(1);d.assets.a.values[d.end]=40;close(run(d).final.tax,0)});
test('ten-year schedule has 21 CPI-scaled contributions',()=>{const d=fixture();E.months(d.start,d.end).forEach((m,i)=>d.macro.us_cpi[m]=100+i);const r=run(d);assert.equal(r.payments.length,21);close(r.payments[0].amount,1500*100/220);close(r.final.displayIn,31500)});
test('steering buys only the underweight asset, never sells',()=>{const d=fixture(12);d.assets.a.values[d.end]=200;const r=run(d,{weights:{a:.5,b:.5},contribution:100});close(r.final.units.a,r.rows[11].units.a);close(r.final.units.b,2);r.rows.slice(1).forEach((x,i)=>{assert.ok(x.units.a>=r.rows[i].units.a);assert.ok(x.units.b>=r.rows[i].units.b)})});
test('later inception and gaps rejected',()=>{const d=fixture();d.assets.a.start='2000-01';assert.throws(()=>run(d),/unavailable/);d.assets.a.start=d.start;delete d.assets.a.values['1999-02'];assert.throws(()=>run(d),/invalid/)});
test('fixed FX bucket equals USD and EUR transform uses dated FX',()=>{const d=fixture();close(run(d).final.displayAfterTax,run(d,{unit:'bucket'}).final.displayAfterTax);close(E.transform(120,'1999-01',d.start,d,'eur',false),100)});
test('money in transformed at payment dates; tax remains nominal USD',()=>{const d=fixture(6);d.macro.gbpusd[d.end]=3;const r=run(d,{unit:'bucket'});close(r.final.displayIn,2500);close(r.final.tax,0)});
test('contributions do not disguise drawdown or underwater months',()=>{const d=fixture(6);for(const m of E.months('1999-02',d.end))d.assets.a.values[m]=50;const r=run(d);close(r.drawdown.fraction,.5);assert.equal(r.underwater,6);assert.equal(r.longest,6);assert.equal(r.recovery,null)});
test('range respects publication date and needs 12 complete windows',()=>{const d=fixture();const p={kind:'advice',published:'2006-01',weights:{a:1}};assert.equal(E.ranges(d,p,3).count,1);p.published='2005-01';const r=E.ranges(d,p,3);assert.equal(r.count,13);close(r.median,1);assert.equal(E.ranges(d,{...p,kind:'fashion'},3),null)});
test('invalid inputs rejected',()=>{const d=fixture();for(const o of [{weights:{a:.9}},{weights:{a:NaN}},{contribution:0},{taxRate:-1},{interval:0},{end:'2000-13'}])assert.throws(()=>run(d,o))});
test('flat nominal deposits lose purchasing power and are flagged in real units',()=>{
 const d=fixture(1);d.macro.us_cpi[d.end]=200;
 const real=run(d),nominal=run(d,{real:false});
 close(real.final.nominalMultiple,1);close(real.final.multiple,.5);
 close(real.final.multiple,real.final.displayAfterTax/real.final.displayIn);
 assert.equal(real.final.afterTaxBelowMoneyIn,true);assert.equal(real.underwater,1);
 assert.equal(real.recovery,null);close(real.drawdown.fraction,.5);
 close(nominal.final.multiple,1);assert.equal(nominal.underwater,0);
 close(real.final.tax,nominal.final.tax);
});
test('currency changes affect worst month, recovery and drawdown in displayed units',()=>{
 const d=fixture(2);d.assets.a.values['1999-02']=150;d.assets.a.values['1999-03']=120;
 d.macro.eurusd={'1999-01':1,'1999-02':2,'1999-03':1};
 const eur=run(d,{unit:'eur',real:false}),usd=run(d,{unit:'usd',real:false});
 assert.equal(eur.worst.month,'1999-02');assert.equal(eur.recovery,'1999-03');
 close(eur.worst.ratio,.75);close(eur.drawdown.fraction,.25);assert.equal(eur.underwater,1);
 assert.equal(usd.underwater,0);close(usd.drawdown.fraction,.2);
 close(eur.final.tax,usd.final.tax);assert.deepEqual(eur.final.units,usd.final.units);
});
test('bucket conversion affects flags and multiples, while tax remains USD',()=>{
 const d=fixture(1);d.macro.gbpusd[d.end]=4.5;
 const r=run(d,{unit:'bucket',real:false});
 close(r.final.multiple,.5);assert.equal(r.final.afterTaxBelowMoneyIn,true);
 assert.equal(r.underwater,1);close(r.final.tax,0);
});
test('rolling ranges honour the currency and purchasing-power controls',()=>{
 const d=fixture(50);E.months(d.start,d.end).forEach((m,i)=>{d.macro.euro_hicp[m]=100+i;d.macro.us_cpi[m]=100+i;d.macro.eurusd[m]=1+i/100;});
 const p={kind:'fund',published:d.start,weights:{a:1}};
 const nominal=E.ranges(d,p,3,{unit:'usd',real:false});
 const real=E.ranges(d,p,3,{unit:'usd',real:true});
 const eur=E.ranges(d,p,3,{unit:'eur',real:true});
 close(nominal.median,1);assert.ok(real.best.multiple<1);assert.ok(eur.best.multiple<real.best.multiple);
 const direct=run(d,{start:eur.worst.start,end:E.addMonths(eur.worst.start,36),unit:'eur',real:true});
 close(eur.worst.multiple,direct.final.displayAfterTax/direct.final.displayIn);
});
