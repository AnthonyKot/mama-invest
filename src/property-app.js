(function(){
 'use strict';
 const D=globalThis.MAMA_DATA,Q=globalThis.MAMA_PROPERTY_DATA,H=globalThis.MamaProperty,E=globalThis.MamaEngine,P=globalThis.MamaPortfolios,F=globalThis.MamaPropertyForecast,C=globalThis.MAMA_PROPERTY_FORECAST;
 const host=document.createElement('section');host.id='property';host.className='property-section';
 document.querySelector('#app footer').before(host);
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const starts=['1999-01','2006-07','2007-07'],classic={id:'dollar5050',name:'Dollar 50/50',weights:{us_stocks:.5,us_bonds:.5}};
 const state={unit:'eur',deposit:20,costMode:'separate',maintenanceRate:1,otherCostShare:20,costShare:35,sellingCost:2,foreignPurchase:4,nlEarlyTax:50,usRent:24,usSale:15,usInvestor:15,ukRent:20,ukSale:24,ukInvestor:24,nlTaxScale:100,forecastStart:'2007-07',forecastEnd:'2028-12',forecastMix:'5050',portfolios:{'1999-01':'dollar5050','2006-07':'dollar5050','2007-07':'dollar5050'},open:null};
 let results={};
 Object.assign(state,{horizonStart:'2007-07',horizonMode:'observed',horizonEnd:'2028-12'});
 const date=m=>new Date(m+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'});
 const number=x=>Number.isFinite(x)?Math.round(x).toLocaleString('en-GB'):'—';
 const money=x=>(state.unit==='eur'?'€':'$')+number(x);
 const local=(x,c)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:c.currency,maximumFractionDigits:0}).format(x);
 const mult=x=>Number.isFinite(x)?x.toFixed(2)+'×':'Not defined';
 const rate=x=>Number.isFinite(x)?(100*x).toFixed(2)+'% / year':'No finite yearly rate';
 const choices=s=>[classic,...P.availablePresets(D,s)];
 const numControl=(key,label,min,max,step=1)=>`<label class="control">${label}<input data-setting="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${state[key]}"></label>`;
 function preparedCountry(id,original){
  const country=structuredClone(original);
  for(const [year,rule] of Object.entries(country.taxRules)){
   if(id==='nl'){
    if(Number(year)<2001)rule.rentRate=state.nlEarlyTax/100;
    if(rule.wealthRate)rule.wealthRate*=state.nlTaxScale/100;
    if(rule.rate)rule.rate*=state.nlTaxScale/100;
   }else{rule.rentRate=state[id+'Rent']/100;rule.saleRate=state[id+'Sale']/100;}
  }
  return country;
 }
 function options(id){return {deposit:state.deposit/100,costShare:(state.costMode==='separate'?state.otherCostShare:state.costShare)/100,
  maintenanceRate:state.costMode==='separate'?state.maintenanceRate/100:0,sellingCost:state.sellingCost/100,
  purchaseCost:id==='nl'?undefined:state.foreignPurchase/100,unit:state.unit};}
 function calculate(){
  results={};
  for(const start of starts)for(const [id,original] of Object.entries(Q.countries)){
   if(!original.cases[start])continue;
   const country=preparedCountry(id,original);
   const property=H.simulate(D,country,{start,...options(id)});
   const portfolio=choices(start).find(p=>p.id===state.portfolios[start])||classic;
   results[start+':'+id]={id,country,property,portfolio,...H.compare(D,property,portfolio.weights,{country,gainRate:state[id+'Investor']/100})};
  }
 }
 function status(p){return p.finished?'Completed: 20 years':`Not finished: ${(p.elapsedMonths/12).toFixed(1)} years of 20. As if sold ${date(p.end)}.`;}
 function worst(w,isHome){return w?`${mult(isHome?w.worstRatio:w.multiple)}<small>${date(w.month)}</small>`:'Not defined';}
 function scoreboard(start){
  return `<section class="panel"><div class="section-head"><h3>Bought ${date(start)}</h3><label>Compare with <select data-portfolio="${start}">${choices(start).map(p=>`<option value="${p.id}" ${p.id===state.portfolios[start]?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label></div>
   <div class="scroll" tabindex="0" aria-label="Landlord and investor comparison for ${date(start)}"><table class="property-table"><thead><tr><th scope="col">Country and endpoint</th><th scope="col">Same money paid in</th><th scope="col">Landlord ends with</th><th scope="col">Investor ends with</th><th scope="col">Final amounts compared</th><th scope="col">Landlord worst</th><th scope="col">Investor worst</th></tr></thead><tbody>
   ${Object.entries(Q.countries).map(([id,c])=>{
    const r=results[start+':'+id];if(!r)return `<tr><th>${esc(c.name)}</th><td colspan="6">No purchase-date coverage</td></tr>`;
    const p=r.property,f=p.final,i=r.investor.final;
    return `<tr data-detail="${start}:${id}" class="property-result"><th scope="row"><button type="button" data-open="${start}:${id}" aria-expanded="${state.open===start+':'+id}">${esc(c.name)}</button><small>${date(p.end)}${p.finished?' · 20 years':` · ${(p.elapsedMonths/12).toFixed(1)} of 20 years`}</small></th>
     <td>${money(f.displayIn)}<small>Up front: ${money(p.displayUpfront)}</small><small>Later top-ups: ${money(f.displayIn-p.displayUpfront)}</small><small>Matched within this country</small></td><td class="${f.multiple<1?'loss':''}">${mult(f.multiple)}<small>${rate(p.annualReturn)}</small><small>${money(f.displayValue)}</small></td>
     <td class="${i.multiple<1?'loss':''}">${mult(i.multiple)}<small>${rate(r.annualReturn)}</small><small>${money(i.displayAfterTax)}</small></td>
     <td>${mult(r.margin)}<small>Landlord ÷ investor</small><small>${r.margin>1?'Landlord ahead':r.margin<1?'Investor ahead':'Equal'}${Math.abs(r.margin-1)<.05?' · close result':''}</small></td>
     <td>${worst(p.worst,true)}</td><td>${worst(r.investor.worst,false)}</td></tr>`;
   }).join('')}<tr><th scope="row">Poland</th><td colspan="6" class="unavailable-cell">${start==='1999-01'?'Unavailable: national price series starts in 2005.':'Unavailable: typical-home purchase price and mortgage-rate inputs not verified.'}</td></tr>
   </tbody></table></div>${fundingTable(start)}<p class="muted">A 3× result means three times the money paid in, after tax and inflation. The yearly return accounts for when payments were made. Compare the two sides within each row: different countries require different payments. “Dollar 50/50” holds US stocks and US bonds; the currency control determines how its result is displayed.</p><p class="muted">“Worst” compares worth with money paid in by that month. For a landlord it includes selling costs: an immediate sale can show a loss before house prices change. End dates vary with source coverage; unfinished cases are hypothetical sales, not forecasts. Select a country for monthly costs and loan details.</p></section>`;
 }
 function fundingTable(start){
  const rows=Object.values(results).filter(r=>r.property.start===start);
  return `<details><summary>Why does each country need a different amount of cash?</summary><p>These are different national home-price proxies, not identical homes. Prices below use purchase-date exchange rates, without inflation adjustment. The results above use a common purchasing-power basis.</p><div class="scroll"><table><thead><tr><th>Country</th><th>Home price in ${date(start)} ${state.unit.toUpperCase()}</th><th>Mortgage rate</th><th>First month: mortgage</th><th>Gross rent</th><th>Operating costs</th><th>Rent / annual tax paid</th><th>Your top-up</th></tr></thead><tbody>${rows.map(r=>{
   const p=r.property,c=r.country,m=p.rows[1];
   const purchasePrice=E.transform(p.price*c.usdPerLocal[start],start,start,D,state.unit,false);
   return `<tr><th>${esc(c.name)}</th><td>${money(purchasePrice)}</td><td>${(p.rate*100).toFixed(2)}%</td><td>${local(m.mortgagePayment,c)}</td><td>${local(m.grossRent,c)}</td><td>${local(m.runningCosts,c)}</td><td>${local(m.rentTax+m.annualTax,c)}</td><td>${local(m.outOfPocket,c)}</td></tr>`;
  }).join('')}</tbody></table></div><p>Monthly amounts are in the local currency of each country at the time. Annual taxes can fall in later months. Each row assumes a local resident. US effective tax is on positive rent after operating costs and mortgage interest; the UK model uses net-rent tax with an interest credit. Different prices, loan rates, rent and taxes create different top-ups.</p></details>`;
 }
 function chart(r){
  const p=r.property,rows=p.rows,investor=r.investor.rows,W=900,Ht=300,L=65,R=20,T=20,B=35;
  const vals=rows.flatMap((v,i)=>[v.displayValue,v.displayEquity,v.displayIn,investor[i].displayAfterTax]);
  const min=Math.min(0,...vals),max=Math.max(1,...vals)*1.06,x=i=>L+i*(W-L-R)/(rows.length-1),y=v=>Ht-B-(v-min)/(max-min)*(Ht-T-B);
  let svg='';for(let i=0;i<4;i++){const v=min+(max-min)*i/3;svg+=`<line class="grid" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end">${new Intl.NumberFormat('en-GB',{notation:'compact',maximumFractionDigits:0}).format(v)}</text>`;}
  for(const [key,color] of [['displayValue','#206552'],['displayEquity','#b46c29'],['displayIn','#333'],['investor','#5c63a2']]){
   const path=rows.map((v,i)=>`${i?'L':'M'}${x(i)},${y(key==='investor'?investor[i].displayAfterTax:v[key])}`).join(' ');
   svg+=`<path class="curve" stroke="${color}" ${key==='displayIn'?'stroke-dasharray="5 5"':''} d="${path}"/>`;
  }
  svg+=`<text x="${L}" y="${Ht-8}">${p.start}</text><text text-anchor="end" x="${W-R}" y="${Ht-8}">${p.end}</text>`;
  return `<div class="legend"><span style="--color:#206552">Landlord after sale, including savings</span><span style="--color:#b46c29">Home equity before sale costs</span><span style="--color:#5c63a2">Investor after tax</span><span style="--color:#333">Money in</span></div><svg class="chart property-chart" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Landlord and investor monthly purchasing-power paths; exact values follow in the monthly table">${svg}</svg>`;
 }
 function forecastPanel(){
  if(!F||!C)return '<p class="error">Forecast module unavailable.</p>';
  const start=state.forecastStart,end=state.forecastEnd==='term'?E.addMonths(start,240):state.forecastEnd;
  const weights=state.forecastMix==='6040'?{us_stocks:.6,us_bonds:.4}:classic.weights;
  const portfolioName=state.forecastMix==='6040'?'Classic 60/40':'Dollar 50/50';
  const rows=[];
  for(const scenario of C.scenarios)for(const [id,original] of Object.entries(Q.countries)){
   if(!original.cases[start])continue;
   const country=preparedCountry(id,original);
   rows.push({id,country,scenarioLabel:scenario.name,...F.compare(D,country,id,{start,end,scenario:scenario.id,weights,...options(id),gainRate:state[id+'Investor']/100})});
  }
  const scale=Math.max(1,...rows.flatMap(r=>[r.property.final.displayIn,r.property.final.displayValue,r.investor.final.displayAfterTax,r.cash]));
  const bar=(amount,label)=>`<meter min="0" max="${scale}" value="${Math.max(0,amount)}" aria-label="${esc(label)}"></meter>`;
  return `<section class="panel forecast-panel"><h3>2006-07 buyers: hold through 2026, 2027 or 2028</h3>
   <p class="notice">Scenario estimates, not historical results. Sources reviewed ${C.reviewed}. All amounts use ${date(D.end)} purchasing power, with the same dated payments on both sides.</p>
   <div class="controls"><label class="control">Bought<select data-setting="forecastStart">${['2006-07','2007-07'].map(s=>`<option value="${s}" ${start===s?'selected':''}>${date(s)}</option>`).join('')}</select></label>
   <label class="control">Sell at<select data-setting="forecastEnd">${[['term','Exactly 20 years'],['2026-12','December 2026'],['2027-12','December 2027'],['2028-12','December 2028']].map(([v,n])=>`<option value="${v}" ${state.forecastEnd===v?'selected':''}>${n}</option>`).join('')}</select></label>
   <label class="control">Investment comparison<select data-setting="forecastMix"><option value="5050" ${state.forecastMix==='5050'?'selected':''}>Dollar 50/50</option><option value="6040" ${state.forecastMix==='6040'?'selected':''}>Classic 60/40</option></select></label></div>
   <p>Sale date: <strong>${date(end)}</strong> (${((E.monthNumber(end)-E.monthNumber(start))/12).toFixed(1)} years held). The 20-year mortgage ends ${date(E.addMonths(start,240))}; rent, upkeep and taxes continue afterwards. Stock/bond weights are contribution targets, not a promise of constant rebalancing.</p>
   <div class="scroll"><table class="property-table"><thead><tr><th>Scenario / country</th><th>Money paid in</th><th>Landlord after sale</th><th>${portfolioName} after model tax</th><th>Held cash, no interest</th><th>Final comparison</th></tr></thead><tbody>${rows.map(r=>{
    const p=r.property,f=p.final,i=r.investor.final;
    return `<tr><th scope="row">${esc(r.scenarioLabel)}<small>${esc(r.country.name)} resident</small>${r.country.cases[start].priceEstimated?'<small>Purchase-price level estimated</small>':''}</th>
     <td>${money(f.displayIn)}${bar(f.displayIn,'Money paid in')}<small>Up front: ${money(p.displayUpfront)}</small><small>Later: ${money(f.displayIn-p.displayUpfront)}</small></td>
     <td>${money(f.displayValue)}${bar(f.displayValue,'Landlord final wealth')}<small>${mult(f.multiple)} / ${rate(p.annualReturn)}</small><small>Loan left (local): ${local(f.loan,r.country)}</small></td>
     <td>${money(i.displayAfterTax)}${bar(i.displayAfterTax,'Investor final wealth')}<small>${mult(i.multiple)} / ${rate(r.annualReturn)}</small></td>
     <td>${money(r.cash)}${bar(r.cash,'Uninvested cash')}<small>Local currency, before cash taxes</small></td>
     <td>${mult(r.margin)}<small>Landlord / investor</small><small>${r.margin>=1?'Landlord':'Investor'} ahead${Math.abs(r.margin-1)<.05?' - close result':''}</small></td></tr>`;
   }).join('')}</tbody></table></div>
   <p>Bars share one scale. Each scenario recalculates the landlord cash shortfalls and gives the investor those exact contributions. More money paid in does not mean a better return. The main investment graph above uses a different payment schedule and tax model.</p>
   <details open><summary>Where observations stop and estimates begin</summary><ul>${Object.entries(Q.countries).map(([id,c])=>`<li>${esc(c.name)} property observations end ${date(c.end)}. ${c.end<D.end?`Missing months through ${date(D.end)} hold house prices and rents flat as an explicit data-gap estimate.`:''} Future scenario growth starts ${date(E.addMonths(D.end,1))}.</li>`).join('')}</ul>
   <p>Stocks, bonds and macro data run through ${date(D.end)} (including the existing labelled inflation estimates). No historical values are overwritten. Future FX and deposit rates are held constant. Reference rents and inflation grow 2% annually by assumption. Tax parameters are frozen at 2026 model settings; enacted or proposed future tax changes are not reconstructed. Mortgages retain the original fixed-rate assumption.</p></details>
   <details><summary>Forecast inputs, sources and pessimistic assumptions</summary>
   <p>All rates below are nominal annual changes, before the calculation of model taxes and inflation. Annual rates compound in equal monthly steps; only missing future months are extended. Annual-average housing outlooks are approximate path inputs, not exact year-end targets. NL and US 2028 growth repeats 2027 as our extrapolation. No probability is assigned to any scenario.</p>
   <div class="scroll"><table><thead><tr><th>Scenario</th><th>Year</th><th>House prices NL / UK / US</th><th>US stocks</th><th>US bonds</th><th>Rent</th><th>Inflation</th></tr></thead><tbody>${C.scenarios.flatMap(s=>[2027,2028].map(year=>{
    const a=F.rates('nl',s.id,year),pct=v=>(100*v).toFixed(1)+'%';
    return `<tr><th>${esc(s.name)}</th><td>${year}</td><td>${['nl','uk','us'].map(id=>pct(F.rates(id,s.id,year).house)).join(' / ')}</td><td>${pct(a.stocks)}</td><td>${pct(a.bonds)}</td><td>${pct(a.rent)}</td><td>${pct(a.inflation)}</td></tr>`;
   })).join('')}</tbody></table></div>
   <p>Both stress cases are our assumptions, not bank forecasts or worst-case bounds. They begin in January 2027; the 2026 endpoint is therefore identical across scenarios.</p>
   ${C.sources.map(s=>`<p><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.name)}</a> (${s.published}): ${esc(s.note)}</p>`).join('')}</details></section>`;
 }
 function detail(r){
  const p=r.property,c=r.country,f=p.final,t=p.totals,conv=(v,m=p.end)=>E.transform(v*c.usdPerLocal[m],m,p.start,D,state.unit,true);
  const extras=globalThis.MAMA_PROPERTY_SELECTION?.start===p.start?globalThis.MAMA_PROPERTY_SELECTION.portfolios:[];
  const portfolios=[r.portfolio,...extras.filter(x=>x.id!==r.portfolio.id)];
  const netRent=p.shown.grossRent-p.shown.runningCosts-p.shown.rentTax-p.shown.annualTax;
  const profit=f.displayValue-f.displayIn;
  const explained=p.displayPriceGrowth+netRent+p.shown.savingsInterest-p.shown.interest-p.shown.purchaseCosts-conv(f.sellingCosts)-conv(f.saleTax);
  const rule=c.taxRules[Number(p.end.slice(0,4))];
  return `<article class="panel" id="property-detail"><div class="section-head"><h3>${esc(c.name)} · bought ${date(p.start)}</h3><button type="button" data-close>Close details</button></div><p class="stamp">${status(p)}</p>
   <div class="cards"><div class="card"><h4>Up front</h4><p class="metric">${money(p.displayUpfront)}</p><p>${local(p.upfront,c)} at purchase: deposit plus ${local(p.purchaseCosts,c)} purchase costs.</p><p>Home price: ${local(p.price,c)}. Loan: ${local(p.initialLoan,c)}. Fixed model rate: ${(p.rate*100).toFixed(2)}%.</p></div>
   <div class="card"><h4>Monthly out of pocket</h4><p>First-year average: <strong>${money(p.firstYear)}</strong> (${local(p.firstYearLocal,c)} then).</p><p>${p.finished?'20-year':'Observed-period'} average: <strong>${money(p.average)}</strong> (${local(p.averageLocal,c)} in nominal local money).</p><p>Highest in purchasing power: <strong>${money(p.highest?.displayOutOfPocket)}</strong>, ${date(p.highest.month)} (${local(p.highest.outOfPocket,c)} then).</p><p>Initial monthly mortgage: ${money(conv(p.payment,E.addMonths(p.start,1)))} (${local(p.payment,c)}); first rent kept: ${money(p.rows[1].displayRent)} (${local(p.rows[1].rentKept,c)}).</p>
    <p>${p.firstCovered?'Rent first covered the payment in '+date(p.firstCovered)+'.':'Rent never covered the payment.'} ${p.coveredFrom?'It covered the payment and model taxes every subsequent observed month from '+date(p.coveredFrom)+'.':'There was no sustained coverage through the endpoint.'}</p></div>
   <div class="card"><h4>${p.finished?'After 20 years':'If sold at the data endpoint'}</h4><p>Home value: ${money(conv(f.value))}<br>Loan remaining: ${money(conv(f.loan))}<br>Savings pot: ${money(conv(f.savings))}<br>After sale costs and tax: <strong>${money(f.displayValue)}</strong><br>Total paid in: ${money(f.displayIn)}</p><p>${mult(f.multiple)} · ${rate(p.annualReturn)}</p></div>
   <div class="card"><h4>The difficult part</h4><p>${p.negativeEquityMonths} months owing more than the home was worth.</p><p>Lowest local equity: ${money(conv(p.lowestEquity.equity,p.lowestEquity.month))}, ${date(p.lowestEquity.month)}.</p><div class="gut"><strong>Would you have kept paying here?</strong><p>Worst relative to money in: ${date(p.worst.month)}. Net equity ${money(p.worst.displayWorstWorth)}, against ${money(p.worst.displayIn)} paid in. This worst-equity measure excludes the savings pot and sale-gain tax, as specified.</p></div></div></div>
   <h4>Where the result came from</h4><div class="scroll"><table><tbody>
    ${[['Home price growth in purchasing power',p.displayPriceGrowth],['Gross rent',p.shown.grossRent],['Maintenance and replacements',-p.shown.maintenance],[state.costMode==='separate'?'Other operating costs':'Combined operating costs (includes upkeep)',-p.shown.otherCosts],['Rental-income tax',-p.shown.rentTax],['Annual property/wealth taxes',-p.shown.annualTax],['Loan interest',-p.shown.interest],['Savings interest after model savings tax',p.shown.savingsInterest],['Purchase costs',-p.shown.purchaseCosts],['Selling costs',-conv(f.sellingCosts)],['Sale-gain tax',-conv(f.saleTax)],['Currency and purchasing-power effect on financed cash flows',profit-explained],['Net result above money paid in',profit]].map(([name,value])=>`<tr><th scope="row">${name}</th><td>${money(value)}</td></tr>`).join('')}
   </tbody></table></div><p>Rent kept after running costs and rental/annual taxes: ${money(netRent)}. Rent funded mortgage payments; it is not added to the final home value a second time.</p>
   <h4>Same payments, different investments</h4><div class="scroll"><table><thead><tr><th>Investment</th><th>After tax</th><th>Multiplier</th><th>Yearly real return</th></tr></thead><tbody><tr><th>Landlord</th><td>${money(f.displayValue)}</td><td>${mult(f.multiple)}</td><td>${rate(p.annualReturn)}</td></tr>${portfolios.map(portfolio=>{const x=H.compare(D,p,portfolio.weights,{country:c,gainRate:state[r.id+'Investor']/100});return `<tr><th>${esc(portfolio.name)}</th><td>${money(x.investor.final.displayAfterTax)}</td><td>${mult(x.investor.final.multiple)}</td><td>${rate(x.annualReturn)}</td></tr>`;}).join('')}</tbody></table></div>
   ${chart(r)}<details><summary>Exact monthly payments, loan and results</summary><div class="scroll"><table><thead><tr><th>Month</th><th>Payment</th><th>Mortgage</th><th>Rent kept</th><th>Loan remaining</th><th>Landlord after sale</th><th>Investor after tax</th></tr></thead><tbody>${p.rows.map((v,i)=>`<tr><th scope="row">${v.month}</th><td>${money(E.transform(v.paidUSD,v.month,p.start,D,state.unit,true))}</td><td>${money(v.displayMortgage)}</td><td>${money(v.displayRent)}</td><td>${money(conv(v.loan,v.month))}</td><td>${money(v.displayValue)}</td><td>${money(r.investor.rows[i].displayAfterTax)}</td></tr>`).join('')}</tbody></table></div></details>
   <h4>Inputs and tax treatment</h4><p>${esc(c.cases[p.start].priceNote||c.priceNote)}</p><p>${esc(c.rateNote)}</p><p><a href="${esc(c.yieldAnchor.source)}" target="_blank" rel="noreferrer">Rent anchor</a>: ${esc(c.yieldAnchor.note)} The historical rent path is derived from OECD price-to-rent ratios.</p><p>${esc(rule.note)} <a href="${esc(rule.source)}" target="_blank" rel="noreferrer">Tax source</a>. Rates changed above override these defaults.</p>
   ${r.id==='nl'?`<details><summary>Dutch tax timeline and year-by-year assumptions</summary><p>1999–2000: income and wealth taxes. 2001: deemed-return box 3. 2010: rented-home valuation discount. 2011: single annual valuation date. 2017: wealth-mix bands. 2023: separate property/debt rates and reduced valuation discount. 2024: 36% box 3 rate.</p><div class="scroll"><table><thead><tr><th>Year</th><th>Rule / caveat</th></tr></thead><tbody>${Object.entries(c.taxRules).filter(([y])=>Number(y)>=Number(p.start.slice(0,4))&&Number(y)<=Number(p.end.slice(0,4))).map(([year,rule])=>`<tr><th>${year}</th><td class="tax-description"><a href="${esc(rule.source)}" target="_blank" rel="noreferrer">${esc(rule.note)}</a>${rule.approximation?'<br>Estimate: '+esc(rule.approximation):''}</td></tr>`).join('')}</tbody></table></div></details>`:''}
   <p><a href="PROPERTY-README.md">Full source review, tax limitations and unavailable countries</a> · <a href="data/property-tax-rules.json">Yearly tax parameters</a></p></article>`;
 }
 function horizonTable(){
  const start=state.horizonStart,forecast=state.horizonMode!=='observed';
  const weights=state.forecastMix==='6040'?{us_stocks:.6,us_bonds:.4}:classic.weights;
  const investorName=state.forecastMix==='6040'?'Classic 60/40':'Dollar 50/50';
  const horizons=[3,5,10,15,20];
  return `<section class="panel" id="property-horizons"><h3>What was left after tax? Property over time</h3>
   <p>Each column is a hypothetical sale at that date, after costs and simplified resident model taxes. Multiples divide the final amount by the dated money paid in. Red means less came back than went in. All amounts use ${date(D.end)} purchasing power.</p>
   <div class="controls"><label class="control">Bought<select data-setting="horizonStart">${starts.map(s=>`<option value="${s}" ${start===s?'selected':''}>${date(s)}</option>`).join('')}</select></label>
   <label class="control">History or scenario<select data-setting="horizonMode"><option value="observed" ${!forecast?'selected':''}>Observed data only</option>${C.scenarios.map(s=>`<option value="${s.id}" ${state.horizonMode===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label>
   ${forecast?`<label class="control">Scenario endpoint<select data-setting="horizonEnd">${['2026-12','2027-12','2028-12'].map(m=>`<option value="${m}" ${state.horizonEnd===m?'selected':''}>${date(m)}</option>`).join('')}</select></label>`:''}</div>
   <p>Investor: ${investorName}, using the investment mix selected in the scenario panel. Both sides receive the same initial payment and the same later top-ups. These are cumulative results since purchase, not returns earned only during the last interval.</p>
   <div class="scroll"><table class="property-table"><thead><tr><th>Country / investment</th>${horizons.map(y=>`<th>${y} years<small>${date(E.addMonths(start,y*12))}</small></th>`).join('')}<th>At the end</th></tr></thead>
   ${Object.entries(Q.countries).map(([id,original])=>{
    if(!original.cases[start])return '';
    const country=preparedCountry(id,original),end=forecast?state.horizonEnd:[country.end,D.end].sort()[0];
    const dates=[...horizons.map(y=>E.addMonths(start,y*12)),end],cache={};
    const cells=dates.map(at=>{
     if(at>end)return null;
     if(cache[at])return cache[at];
     const estimated=at>country.end||at>D.end;
     if(estimated&&!forecast)return null;
     let result;
     if(estimated)result=F.compare(D,country,id,{start,end:at,scenario:state.horizonMode,weights,...options(id),gainRate:state[id+'Investor']/100});
     else{
      const property=H.simulate(D,country,{start,end:at,allowPostTerm:true,...options(id)});
      result={property,...H.compare(D,property,weights,{country,gainRate:state[id+'Investor']/100})};
     }
     return cache[at]={...result,estimated,at};
    });
    const cell=(r,type)=>{
     if(!r)return '<td class="muted">Not reached</td>';
     const p=r.property.final,i=r.investor.final;
     const value=type==='paid'?p.displayIn:type==='home'?p.displayValue:i.displayAfterTax;
     const multiple=type==='paid'?null:type==='home'?p.multiple:i.multiple;
     return `<td class="${multiple!==null&&multiple<1?'loss':''}">${money(value)}${multiple!==null?`<small>${mult(multiple)}</small>`:''}<small>${date(r.at)}</small>${r.estimated?'<small class="estimate-tag">Includes estimates</small>':''}</td>`;
    };
    return `<tbody><tr class="horizon-country"><th colspan="7">${esc(country.name)} resident${country.cases[start].priceEstimated?' - purchase-price level estimated':''}</th></tr>
     <tr><th scope="row">Money paid in</th>${cells.map(r=>cell(r,'paid')).join('')}</tr>
     <tr><th scope="row">Landlord</th>${cells.map(r=>cell(r,'home')).join('')}</tr>
     <tr><th scope="row">${investorName}</th>${cells.map(r=>cell(r,'investor')).join('')}</tr></tbody>`;
   }).join('')}</table></div>
   <p>Observed-only endpoints differ by country. A 20-year result is shown only when that date is reached. Holding beyond year 20 continues rent, costs and taxes with no mortgage payment. Estimated cells use the data-gap and forecast assumptions documented above; stress cases start in 2027.</p></section>`;
 }
 function render(){
  try{calculate();}catch(error){host.innerHTML=`<h2>Landlord or investor?</h2><p class="error">${esc(error.message)}</p>`;return;}
  host.innerHTML=`<h2>Landlord or investor?</h2><p>One rental home, a 20-year mortgage, and the same cash invested on the same dates. Compare what was left in purchasing power after costs and model taxes.</p>
   <div class="notice">These are estimates for national-average homes. Tax brackets, the rent anchor and mortgage-rate proxies matter. Dutch tax relief and individual valuations cannot be reconstructed completely; US state taxes, depreciation and recapture are excluded. Investment distribution taxes are not separately modelled. Read the source notes before interpreting a small winning margin.</div>
   <div class="controls"><label class="control">Purchasing power in<select data-setting="unit"><option value="eur" ${state.unit==='eur'?'selected':''}>Euros · euro-area inflation</option><option value="usd" ${state.unit==='usd'?'selected':''}>US dollars · US inflation</option></select></label>${numControl('deposit','Deposit (%)',0,40)}<label class="control">Operating-cost method<select data-setting="costMode"><option value="separate" ${state.costMode==='separate'?'selected':''}>Separate upkeep and other costs</option><option value="combined" ${state.costMode==='combined'?'selected':''}>Original combined allowance</option></select></label>${state.costMode==='separate'?numControl('maintenanceRate','Annual upkeep (% of current home value)',0,10,.1)+numControl('otherCostShare','Other costs (% of gross rent)',0,100):numControl('costShare','All operating costs, including upkeep (% of rent)',0,100)}${numControl('sellingCost','Selling costs (%)',0,20,.1)}${numControl('foreignPurchase','Purchase costs outside NL (%)',0,20,.1)}</div>
   <p class="muted">${state.costMode==='separate'?'Upkeep is charged monthly at the selected annual percentage of the current home value. Other costs cover vacancy, management, insurance and local charges, excluding upkeep. Defaults of 1% and 20% are adjustable planning assumptions, not measured historical costs.':'The original combined allowance covers upkeep, vacancy, management, insurance and local charges. No separate upkeep charge is added.'} Costs are treated as spent, not as an untouched reserve. Repairs and replacements are smoothed over time and treated as deductible operating expenses where the tax model allows; capital improvements and individual major bills are not modelled.</p>
   <p><strong>Monthly cash needed:</strong> mortgage principal + interest + upkeep + other costs + model taxes minus gross rent, with a minimum of zero. Any surplus goes into savings. These costs affect both the final return and contributions to the matching investment portfolio.</p>
   <details><summary>Tax assumptions you can change</summary><div class="controls">${numControl('nlEarlyTax','NL rental-income rate, 1999–2000 (%)',0,100)}${numControl('nlTaxScale','NL wealth-tax sensitivity (% of model tax)',0,200)}${numControl('usRent','US effective net-rent tax (%)',0,100)}${numControl('usSale','US sale-gain tax (%)',0,100)}${numControl('usInvestor','US investment gain tax (%)',0,100)}${numControl('ukRent','UK net-rent income tax (%)',0,100)}${numControl('ukSale','UK sale-gain tax (%)',0,100)}${numControl('ukInvestor','UK investment gain tax (%)',0,100)}</div><p>Each row assumes a resident of that country, with taxable investments outside pensions or ISAs. US defaults: 24% effective net-rent tax, 15% property and investment gain tax. No depreciation, recapture, passive-loss offsets, NIIT or state taxes. UK defaults: 20% effective net-rent tax with a 20% interest credit; 24% gains tax with a GBP3,000 allowance, from original purchase basis. US/UK investment gains are measured in local currency; dividend and bond-income taxes are not separately reconstructed. Dutch securities use monthly accrual of the annual wealth-tax model, without the rental-property discount. Wealth allowances are assumed used elsewhere. Effective US/UK rates apply across history and forecasts, not statutory year-by-year tax schedules.</p></details>
   ${starts.map(scoreboard).join('')}
   ${forecastPanel()}
   <p>${esc(Q.unavailable.euroInvestor)}</p>
   <p class="property-note">The amounts are comparable; the lives are not. The landlord borrowed, held one building in one country, did the work, and could not sell part of it. The investor did none of that and could sell any day.</p>
   <p class="muted">One real home can do much better or worse than a smooth national index. The model fixes the mortgage rate for 20 years. Vacancy and repairs use the selected cost allowances; no individual emergency or forced sale is simulated. A landlord must keep paying in a bad stretch or sell; a lender would also have required proof of income, which is not modelled. The owner and comparison investor reside in the country of each row. US/UK effective tax assumptions are held constant; Dutch history uses the existing year-specific model.</p>
   <div id="property-details">${state.open&&results[state.open]?detail(results[state.open]):''}</div>
   ${horizonTable()}`;
 }
 host.addEventListener('change',event=>{
  const input=event.target;if(input.dataset.setting){const key=input.dataset.setting;
   if(['unit','costMode','forecastStart','forecastEnd','forecastMix','horizonStart','horizonMode','horizonEnd'].includes(key))state[key]=input.value;else{if(!input.checkValidity()||!Number.isFinite(Number(input.value))){input.reportValidity();return;}state[key]=Number(input.value);}
  }else if(input.dataset.portfolio)state.portfolios[input.dataset.portfolio]=input.value;else return;
  render();
 });
 host.addEventListener('click',event=>{
  if(event.target.closest('[data-close]')){state.open=null;render();return;}
  const target=event.target.closest('[data-detail]');if(!target)return;state.open=target.dataset.detail;render();
  host.querySelector('#property-detail')?.scrollIntoView({block:'start',behavior:'instant'});
 });
 window.addEventListener('mama:selection',()=>{if(state.open)render();});
 render();
})();
