/* Isolated scenario overlays: never write projections into historical datasets. */
(function(root){
 'use strict';
 const E=typeof module!=='undefined'?require('./engine.js'):root.MamaEngine;
 const H=typeof module!=='undefined'?require('./property-engine.js'):root.MamaProperty;
 const C=typeof module!=='undefined'?require('../data/property-forecast.js'):root.MAMA_PROPERTY_FORECAST;
 function rates(id,scenario,year){
  const s=C.scenarios.find(s=>s.id===scenario);if(!s)throw Error('Unknown forecast scenario');
  const r={house:C.reference.house[id]?.[year],stocks:C.reference.stocks,bonds:C.reference.bonds,rent:C.reference.rent,inflation:C.reference.inflation,...s.years?.[year]};
  if(!Number.isFinite(r.house))throw Error('No house forecast for year');
  for(const v of Object.values(r))if(!Number.isFinite(v)||v<=-1)throw Error('Invalid scenario growth');
  return r;
 }
 function extend(series,from,end,growth){
  if(end<=from)return;
  for(const month of E.months(E.addMonths(from,1),end)){
   const previous=series[E.addMonths(month,-1)];
   if(!Number.isFinite(previous))throw Error('Missing forecast anchor');
   if(series[month]!==undefined)continue;
   series[month]=previous*Math.pow(1+growth(month),1/12);
  }
 }
 function project(data,country,id,{end,scenario='reference'}={}){
  E.monthNumber(end);
  if(end>C.lastEnd||end<'2026-01')throw Error('Forecast endpoint must be in 2026-2028');
  rates(id,scenario,2027);
  const d=structuredClone(data),c=structuredClone(country),cutoff=data.end;
  d.inflationBaseEnd=data.inflationBaseEnd||cutoff;
  d.end=[end,cutoff].sort().at(-1);c.end=[country.end,end].sort().at(-1);
  const future=m=>rates(id,scenario,Number(m.slice(0,4)));
  // Missing property observations up to the market-data cutoff are flat
  // placeholders shared by every scenario, never labelled as historical data.
  extend(c.priceIndex,country.end,end,m=>m<=cutoff?0:future(m).house);
  extend(c.rentIndex,country.end,end,m=>m<=cutoff?0:future(m).rent);
  for(const key of ['us_cpi','euro_hicp'])extend(d.macro[key],cutoff,end,m=>future(m).inflation);
  for(const key of ['eurusd','gbpusd'])extend(d.macro[key],cutoff,end,()=>0);
  for(const [key,field] of [['us_stocks','stocks'],['us_bonds','bonds']]){
   extend(d.assets[key].values,cutoff,end,m=>future(m)[field]);
  }
  const fx=c.currency==='EUR'?d.macro.eurusd:c.currency==='GBP'?d.macro.gbpusd:null;
  for(const m of E.months(country.start,c.end))if(c.usdPerLocal[m]===undefined)c.usdPerLocal[m]=fx?fx[m]:1;
  const lastDeposit=Object.keys(c.depositRate).filter(m=>m<=cutoff).sort().at(-1);
  extend(c.depositRate,lastDeposit,end,()=>0);
  const lastTax=Object.keys(c.taxRules).map(Number).sort((a,b)=>a-b).at(-1);
  for(let year=lastTax+1;year<=Number(end.slice(0,4));year++){
   c.taxRules[year]={...structuredClone(c.taxRules[lastTax]),forecastAssumption:true,
    note:'Scenario assumption: tax parameters frozen at '+lastTax+'. Not a prediction of future tax law.'};
  }
  return {data:d,country:c,coverage:{propertyObservedThrough:country.end,marketsObservedThrough:cutoff,
   bridgeFrom:country.end<cutoff?E.addMonths(country.end,1):null,forecastFrom:E.addMonths(cutoff,1),inflationBase:d.inflationBaseEnd}};
 }
 function compare(data,country,id,{start='2007-07',end='2028-12',scenario='reference',weights={us_stocks:.5,us_bonds:.5},gainRate,...options}={}){
  if(Object.keys(weights).some(k=>!['us_stocks','us_bonds'].includes(k)))throw Error('Forecast supports US stocks and aggregate bonds only');
  const overlay=project(data,country,id,{end,scenario});
  const property=H.simulate(overlay.data,overlay.country,{...options,start,end,allowPostTerm:true});
  const comparison=H.compare(overlay.data,property,weights,{country:overlay.country,gainRate});
  const cashUSD=property.localIn*overlay.country.usdPerLocal[end];
  const cash=E.transform(cashUSD,end,start,overlay.data,property.unit,true);
  return {property,...comparison,coverage:overlay.coverage,scenario,cash};
 }
 const api={rates,project,compare};root.MamaPropertyForecast=api;
 if(typeof module!=='undefined')module.exports=api;
})(globalThis);
