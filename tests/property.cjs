const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine.js'),H=require('../src/property-engine.js');
const close=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function fixture(){
 const dates=E.months('1998-12','2019-01'),series=v=>Object.fromEntries(dates.map(m=>[m,v]));
 const data={start:'1998-12',end:'2019-01',macro:{us_cpi:series(100),euro_hicp:series(100),eurusd:series(1),gbpusd:series(1)},assets:{a:{start:'1998-12',values:series(100)}}};
 const country={end:data.end,cases:{'1999-01':{price:100000,rate:.055,purchaseCost:0,grossYield:0}},priceIndex:series(100),rentIndex:series(100),depositRate:series(0),usdPerLocal:series(1),taxRules:Object.fromEntries(Array.from({length:21},(_,i)=>[1999+i,{rentRate:0,saleRate:0}]))};
 return {data,country};
}
test('annuity matches closed form and zero-interest limit',()=>{
 close(H.annuity(120000,.055),120000*(.055/12)/(1-(1+.055/12)**-240));close(H.annuity(120000,0),500);
});
test('240 payments clear debt; flat zero-rent home costs price plus interest',()=>{
 const {data,country}=fixture(),r=H.simulate(data,country,{start:'1999-01',sellingCost:0});
 assert.equal(r.rows.length,241);assert.equal(r.final.loan,0);assert.equal(r.finished,true);
 close(r.localIn,100000+r.totals.interest,.001);close(r.final.proceeds,100000);close(r.totals.principal,80000,.001);
});
test('surplus goes to savings without buying property or paying debt early',()=>{
 const {data,country}=fixture();country.cases['1999-01'].grossYield=.12;
 const r=H.simulate(data,country,{start:'1999-01',costShare:0,sellingCost:0});
 close(r.localIn,20000);assert.ok(r.final.savings>0);close(r.final.value,100000);
 close(r.final.proceeds,r.localIn+r.totals.grossRent-r.totals.interest,.01);
});
test('matched portfolio receives exactly the same cents on the same dates',()=>{
 const {data,country}=fixture();country.usdPerLocal['1999-01']=1.234567;
 const property=H.simulate(data,country,{start:'1999-01'}),c=H.compare(data,property,{a:1});
 close(c.investor.final.invested,property.usdIn,.000001);close(c.investor.final.displayIn,property.final.displayIn);
 for(const r of c.investor.rows)close(r.paid,property.contributions[r.month]);
});
test('annual return recovers 5% with dated monthly contributions',()=>{
 const end='2009-01',payments=E.months('1999-01',end).map(month=>({month,amount:100}));
 const final=payments.reduce((s,p)=>s+p.amount*1.05**((E.monthNumber(end)-E.monthNumber(p.month))/12),0);
 close(H.annualReturn(payments,final,end),.05);assert.equal(H.annualReturn(payments,-100,end),null);
});
test('identical payments and proceeds imply identical multiples and annual return',()=>{
 const {data,country}=fixture();country.cases['1999-01'].rate=0;
 const r=H.simulate(data,country,{start:'1999-01',sellingCost:0}),c=H.compare(data,r,{a:1});
 close(r.final.multiple,c.investor.final.multiple);close(r.annualReturn,c.annualReturn);
});
test('unfinished term retains debt and stops at available observations',()=>{
 const {data,country}=fixture();country.end='2008-01';
 const r=H.simulate(data,country,{start:'1999-01'});assert.equal(r.elapsedMonths,108);assert.equal(r.finished,false);assert.ok(r.final.loan>0);
});
test('negative equity counts owing more than the home is worth',()=>{
 const {data,country}=fixture();country.priceIndex['1999-02']=50;
 const r=H.simulate(data,country,{start:'1999-01'});assert.equal(r.negativeEquityMonths,1);assert.equal(r.lowestEquity.month,'1999-02');assert.ok(r.worst.worstRatio<0);
});
test('year-specific rules switch in the correct year and annual taxes are not doubled',()=>{
 const {data,country}=fixture();country.cases['1999-01'].rate=0;country.cases['1999-01'].grossYield=.06;
 country.taxRules[2000]={rentRate:.5,wealthRate:.01};
 const r=H.simulate(data,country,{start:'1999-01',end:'2000-12',costShare:0});
 assert.equal(r.rows.find(r=>r.month==='1999-12').rentTax,0);assert.equal(r.rows.find(r=>r.month==='2000-01').rentTax,250);
 const dec=r.final;assert.ok(dec.annualTax>0);close(dec.rentKept,dec.grossRent-dec.rentTax-dec.annualTax);
});
test('holding exemption applies at threshold; local gain tax deducts costs',()=>{
 const rule={saleRate:.2,exemptAfterMonths:60,deductPurchaseCosts:true};
 const input={value:200,price:100,purchaseCosts:4,sellingCosts:4};
 close(H.saleTax(rule,{...input,months:59}),18.4);close(H.saleTax(rule,{...input,months:60}),0);
});
test('local cash waterfall reconciles purchase, rent, costs, debt, interest and sale',()=>{
 const {data,country}=fixture();country.cases['1999-01'].grossYield=.08;country.cases['1999-01'].purchaseCost=.04;
 for(const m of Object.keys(country.priceIndex)){country.priceIndex[m]=100+(E.monthNumber(m)-E.monthNumber('1998-12'))*.2;country.depositRate[m]=.03;}
 for(const rule of Object.values(country.taxRules)){rule.rentRate=.2;rule.saleRate=.2;}
 const r=H.simulate(data,country,{start:'1999-01'}),t=r.totals,f=r.final;
 close(f.proceeds,r.localIn+r.priceGrowth+t.grossRent+t.savingsInterest-t.runningCosts-t.rentTax-t.annualTax-t.interest-t.purchaseCosts-f.sellingCosts-f.saleTax,.02);
});
test('missing property observations fail rather than backfill or project',()=>{
 const {data,country}=fixture();delete country.rentIndex['2000-01'];assert.throws(()=>H.simulate(data,country,{start:'1999-01'}),/Missing property observation/);
});

test('rent follows its nominal index and inflation is applied once at display',()=>{
 const {data,country}=fixture();country.cases['1999-01'].grossYield=.06;
 country.rentIndex['1999-02']=120;data.macro.euro_hicp['1999-02']=80;
 const p=H.simulate(data,country,{start:'1999-01',end:'1999-02',costShare:0});
 close(p.final.grossRent,600);close(p.final.displayRent,750);
 close(p.final.outOfPocket,Math.max(0,p.final.mortgagePayment-600));
});

test('separate upkeep is charged on current value even without rent and matched by investor',()=>{
 const {data,country}=fixture();country.cases['1999-01'].rate=0;
 country.priceIndex['1999-02']=120;
 const p=H.simulate(data,country,{start:'1999-01',end:'1999-02',costShare:.2,maintenanceRate:.012});
 close(p.final.maintenance,120);close(p.final.otherCosts,0);
 close(p.final.runningCosts,120);close(p.final.outOfPocket,p.final.mortgagePayment+120);
 close(H.compare(data,p,{a:1}).investor.final.paid,p.final.paidUSD);
 assert.throws(()=>H.simulate(data,country,{start:'1999-01',maintenanceRate:-.01}),/maintenance/);
});

test('upkeep and other costs are counted once and lower the real annual return',()=>{
 const {data,country}=fixture();country.cases['1999-01'].grossYield=.06;
 const baseline=H.simulate(data,country,{start:'1999-01',costShare:.2});
 const p=H.simulate(data,country,{start:'1999-01',costShare:.2,maintenanceRate:.012});
 close(p.rows[1].maintenance,100);close(p.rows[1].otherCosts,100);close(p.rows[1].runningCosts,200);
 close(p.totals.maintenance,24000);close(p.localIn-baseline.localIn,24000,.01);
 assert.ok(p.annualReturn<baseline.annualReturn);
 const t=p.totals,f=p.final;
 close(f.proceeds,p.localIn+p.priceGrowth+t.grossRent+t.savingsInterest-t.runningCosts-
  t.rentTax-t.annualTax-t.interest-t.purchaseCosts-f.sellingCosts-f.saleTax,.03);
});

test('real scenarios reconcile monthly bank, rent, savings and personal cash',()=>{
 const data=require('../data/series.json'),q=require('../data/property.json');
 for(const country of Object.values(q.countries))for(const start of Object.keys(country.cases)){
  const p=H.simulate(data,country,{start});let saved=0;
  for(const r of p.rows.slice(1)){
   close(r.mortgagePayment,r.interest+r.principal,.001);
   const savingsRate=country.depositRate[E.addMonths(r.month,-1)]/12;
   const savingsTax=country.taxRules[r.month.slice(0,4)].savingsIncomeRate||0;
   const interest=Math.round((saved*savingsRate*(1-savingsTax)+Number.EPSILON)*100)/100;
   close(r.grossRent+r.outOfPocket+interest,
    r.runningCosts+r.rentTax+r.annualTax+r.mortgagePayment+r.savings-saved,.03);
   saved=r.savings;
  }
  const t=p.totals,f=p.final;
  close(f.proceeds,p.localIn+p.priceGrowth+t.grossRent+t.savingsInterest-t.runningCosts-
   t.rentTax-t.annualTax-t.interest-t.purchaseCosts-f.sellingCosts-f.saleTax,.03);
 }
});
test('real country cases match cash flows and units for every available comparison',()=>{
 const data=require('../data/series.json'),q=require('../data/property.json'),P=require('../src/portfolios.js');
 for(const country of Object.values(q.countries))for(const start of Object.keys(country.cases))for(const unit of ['eur','usd']){
  const property=H.simulate(data,country,{start,unit});
  assert.equal(property.finished,start==='1999-01');
  if(property.finished)close(property.final.loan,0);else assert.ok(property.final.loan>0);
  for(const weights of [{us_stocks:.5,us_bonds:.5},...P.availablePresets(data,start).map(p=>p.weights)]){
   const c=H.compare(data,property,weights);
   close(c.investor.final.invested,property.usdIn,.00001);
   close(c.investor.final.displayIn,property.final.displayIn,.00001);
   close(property.final.multiple,property.final.displayValue/property.final.displayIn);
   close(c.investor.final.multiple,c.investor.final.displayAfterTax/property.final.displayIn);
   assert.ok(Number.isFinite(property.annualReturn));assert.ok(Number.isFinite(c.annualReturn));
  }
 }
});
