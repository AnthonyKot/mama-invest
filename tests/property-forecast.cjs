const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine.js'),H=require('../src/property-engine.js'),F=require('../src/property-forecast.js');
const D=require('../data/series.json'),Q=require('../data/property.json'),C=require('../data/property-forecast.js');
const close=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);

test('scenario overlays preserve all observations and the purchasing-power base',()=>{
 const old=JSON.stringify([D,Q]);
 const r=F.project(D,Q.countries.us,'us',{end:'2028-12',scenario:'severe'});
 assert.equal(r.data.inflationBaseEnd,D.end);
 for(const [m,v] of Object.entries(D.assets.us_stocks.values))close(r.data.assets.us_stocks.values[m],v);
 for(const [m,v] of Object.entries(Q.countries.us.priceIndex))close(r.country.priceIndex[m],v);
 close(r.country.priceIndex[D.end],Q.countries.us.priceIndex[Q.countries.us.end]);
 close(E.transform(100,'2007-07','2007-07',r.data,'eur'),E.transform(100,'2007-07','2007-07',D,'eur'));
 assert.equal(JSON.stringify([D,Q]),old);
 assert.equal(r.coverage.bridgeFrom,'2025-01');
});

test('annual forecast returns compound once, stresses start in 2027, and FX is held flat',()=>{
 const ref=F.project(D,Q.countries.uk,'uk',{end:'2028-12'});
 const bad=F.project(D,Q.countries.uk,'uk',{end:'2028-12',scenario:'severe'});
 close(ref.data.assets.us_stocks.values['2027-12']/ref.data.assets.us_stocks.values['2026-12'],1.075);
 close(ref.data.assets.us_bonds.values['2027-12']/ref.data.assets.us_bonds.values['2026-12'],1.056);
 close(bad.data.assets.us_stocks.values['2027-12']/bad.data.assets.us_stocks.values['2026-12'],.6);
 close(bad.country.priceIndex['2027-12']/bad.country.priceIndex['2026-12'],.8);
 close(ref.country.priceIndex['2026-12'],bad.country.priceIndex['2026-12']);
 close(ref.data.macro.eurusd['2028-12'],D.macro.eurusd[D.end]);
 close(bad.data.macro.euro_hicp['2027-12']/bad.data.macro.euro_hicp['2026-12'],1.05);
 assert.equal(ref.country.taxRules[2028].forecastAssumption,true);
});

test('every forecast matches upfront and monthly contributions and clears only 240 loan payments',()=>{
 for(const [id,c] of Object.entries(Q.countries))for(const start of ['2006-07','2007-07'])for(const s of C.scenarios){
  const r=F.compare(D,c,id,{start,end:'2028-12',scenario:s.id,costShare:.2,maintenanceRate:.01});
  const p=r.property;
  close(r.investor.final.displayIn,p.final.displayIn);
  for(const [i,row] of p.rows.entries())close(r.investor.rows[i].paid,row.paidUSD);
  close(p.final.loan,0);assert.equal(p.finished,true);
  assert.equal(p.rows.filter(row=>row.mortgagePayment>0).length,240);
  for(const row of p.rows.slice(241)){close(row.mortgagePayment,0);assert.ok(row.grossRent>0);assert.ok(row.maintenance>0);}
  assert.ok(Number.isFinite(r.annualReturn));assert.ok(Number.isFinite(p.annualReturn));
  const t=p.totals,f=p.final;
  close(f.proceeds,p.localIn+p.priceGrowth+t.grossRent+t.savingsInterest-t.runningCosts-t.rentTax-t.annualTax-t.interest-t.purchaseCosts-f.sellingCosts-f.saleTax,.03);
 }
});

test('endpoint choices include exact mortgage anniversary and unfinished 2007 mortgage in 2026',()=>{
 const c=Q.countries.uk;
 const early=F.compare(D,c,'uk',{start:'2007-07',end:'2026-12'});
 assert.ok(early.property.final.loan>0);assert.equal(early.property.finished,false);
 const term=F.compare(D,c,'uk',{start:'2006-07',end:'2026-07'});
 close(term.property.final.loan,0);assert.equal(term.property.elapsedMonths,240);
 assert.throws(()=>F.project(D,c,'uk',{end:'2029-01'}),/endpoint/);
 assert.throws(()=>F.project(D,c,'uk',{end:'2028-12',scenario:'invented'}),/Unknown/);
});

test('resident US rents deduct interest; UK gains are measured from original basis',()=>{
 const us=Q.countries.us.taxRules[2026],uk=Q.countries.uk.taxRules[2026];
 close(H.rentalTax(us,1000,200,300),120);
 close(H.rentalTax(us,1000,200,900),0);
 assert.equal(uk.saleRebase,undefined);
 close(H.saleTax(uk,{value:200000,price:100000,purchaseCosts:4000,sellingCosts:4000,months:240}),21360);
});

test('resident investment gain basis uses dated local currency and NL pays wealth tax instead',()=>{
 const uk={currency:'GBP',usdPerLocal:{'2000-01':2,'2001-01':1},taxRules:{}};
 const policy=H.residentPortfolioTax(uk,{gainRate:.24,allowance:0});
 close(policy.saleTax({month:'2000-01',value:200,paid:200}),0);
 // USD value is unchanged, but GBP value has doubled: a taxable local gain.
 close(policy.saleTax({month:'2001-01',value:200,paid:0}),24);
 const nl=H.residentPortfolioTax({currency:'EUR',usdPerLocal:{'2001-01':1},taxRules:{2001:{wealthRate:.012}}});
 close(nl.annualCharge({month:'2001-01',i:1,value:10000}),10);
 close(nl.saleTax({month:'2001-01',value:20000,paid:10000}),0);
});
