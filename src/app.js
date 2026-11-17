(function(){
 'use strict';
 const D=globalThis.MAMA_DATA,E=globalThis.MamaEngine,P=globalThis.MamaPortfolios;
 const S={
  title:'A little, regularly. Through the worst.',eyebrow:'mama-invest · a family experiment',
  intro:'See what happened when someone kept investing every six months, even after starting at a bad moment in history.',
  through:'History through',scenario:'Choose a starting point',horizon:'How long?',amount:'Every six months, in today’s USD',unit:'Show amounts in',real:'Show today’s purchasing power',
  scenarios:{'1999-01':'January 1999 · Dot-com','2007-07':'July 2007 · Financial crisis','2017-12':'December 2017 · Crypto peak'},
  units:{eur:'Euros',usd:'US dollars',bucket:'Dollar–pound basket'},years:n=>`${n} years`,latest:'To latest data',
  compare:'Choose what to compare',limit:'Up to four portfolios, plus the deposit baseline.',
  kinds:{advice:'Advice',fund:'One fund',fashion:'Popular at the time',family:'Family idea',baseline:'Baseline',custom:'Your mix'},
  custom:'Custom mix',customSource:'Your chosen weights',customHint:'Moving one slider redistributes the remaining percentage across the other assets. The total stays at 100%.',
  baseline:'Always included: Did nothing — half in dollar deposits and half in pound deposits, earning interest.',
  path:'The journey, month by month',chartNote:'Lines show value before a final sale. Table values include the final tax. Dots mark each portfolio’s worst month by after-tax value relative to money paid in.',
  moneyIn:'Money in',before:'Before tax',after:'After tax',end:'At the end',portfolio:'Portfolio',checkpoints:'What was left after tax?',
  checkpointsNote:'Each multiple is the after-tax amount divided by money in, using the amounts shown. Red means less came back than went in. Changing currency or purchasing-power units updates all comparisons.',
  chartLabel:'Portfolio values over time. Use left and right arrow keys to inspect each month.',
  inspect:'Move over the chart, touch it, or focus it and use the arrow keys to inspect a month.',
  stories:'Could you have stayed with it?',
  worst:(date,paid,value)=>`At the lowest point relative to money paid in, in ${date}, you had put in ${paid} and after tax it was worth ${value}.`,
  recovered:date=>`It first got back above money in, in the selected units, in ${date}.`,
  unrecovered:'It had not got back above money in, in the selected units, by the end of this window.',
  never:'At the monthly observations, it never fell below money in in the selected units.',
  final:(date,value,paid)=>`By ${date}, after tax: ${value}, from ${paid} put in.`,
  drop:(percent,peak,trough)=>`Deepest drop in the selected units, excluding new money: ${percent}, from ${peak} to ${trough}.`,
  underwater:(n,longest)=>`After-tax value below money in for ${n} months in total; longest unbroken run: ${longest} months.`,
  gut:'Would you have kept buying here?',rangeTitle:'What if you had started in another month?',
  rangeNote:'Every complete monthly starting window since publication or fund inception. After-tax multiples use your selected currency and purchasing-power setting, just like the cards. Advice portfolios, one-fund portfolios and deposits only. Overlapping windows are not independent outcomes.',
  notEnough:n=>`Not enough history (${n} windows; at least 12 needed).`,
  worstLabel:'Worst',medianLabel:'Median',bestLabel:'Best',windows:n=>`${n} monthly starting windows`,
  unavailable:'—',dataNotes:'What sits behind these numbers',sources:'Sources, mappings and omitted portfolios',
  tax:'Tax: 23% of the whole portfolio’s positive gain in nominal USD, paid once at final sale. No tax credit for losses. No additional fees; embedded fund expenses remain.',
  inflation:'Today’s money uses euro-area HICP for euros, and US CPI for dollars and the dollar–pound basket. Contributions are $1,500 in latest-US-CPI purchasing power by default, converted into the dollars of each payment month. Money in is converted payment by payment.',
  bucket:'The basket is half dollars and half pounds by value at the scenario start. One basket unit equals $1 then. Currency and inflation changes can make displayed money in differ from nominal dollars paid in.',
  rules:'You never sell your holdings before the end. New money goes to assets below their target share. One-fund portfolios use actual fund histories, including the manager’s internal rebalancing and allocation changes. Other published allocations are adapted to our new-money-only rule.',
  estimates:'Estimated data: October 2025 CPI uses the geometric mean of September and November. February–October 2026 pound-deposit rates use the Bank of England’s 3.75% base rate as a proxy. October 2026 euro-area HICP provisionally holds September’s value.',
  proxies:'Gold and silver use monthly average prices. Nasdaq-100 is price-only. Total World Stock uses the actual VT history. A separate US/international blend remains in custom mixes. UK gilt data starts in 2008 and Bitcoin in 2014; neither is backfilled.',
  popular:'“Popular at the time” describes historical enthusiasm, not advice to put all your money there. The favourite-stock baskets are equal-weight illustrations from the brief, not claimed published recommendations.',
  past:'Past results do not predict future results.',review:'Review the README',raw:'Data and approximation details',
  total:'Total',weight:'Target weights',errors:'Please check the inputs.',amountError:'Enter a contribution between $1 and $1,000,000.',
  unitNames:{bucket:'basket units',usd:'USD',eur:'EUR'},customTotal:n=>`Total: ${n}%`,selected:n=>`${n} of 4 selected`,
  worstMoment:'Worst moment',showWorst:'Show this month on the chart',loss:'Below money in',dated:'Money of the time',
  inspectWorst:(name,month)=>`Inspect ${name} at its worst moment, ${month}`,
  chartGut:(names)=>`${names}: would you have kept buying here?`,
 };
 globalThis.MAMA_STRINGS=S;
 const app=document.getElementById('app'),colors=['#78877b','#206552','#b46c29','#5c63a2','#a44656'];
 const defaults={'1999-01':['classic','lifestrategy','favourites99'],'2007-07':['classic','target2050','swensen','favourites07'],'2017-12':['classic','world','bitcoin']};
 let start='1999-01',selected=[...defaults['1999-01']],custom={},runs=[],inspectIndex=0,chartWidth=1050;
 const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=m=>new Date(m+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'});
 const option=(value,label)=>`<option value="${value}">${esc(label)}</option>`;
 const fmt=v=>Math.round(v).toLocaleString('en-GB');
 const mult=v=>`${v.toFixed(2)}×`;
 const control=(id,label,inside)=>`<label class="control" for="${id}">${label}${inside}</label>`;
 app.innerHTML=`<header><span class="eyebrow">${S.eyebrow}</span><h1>${S.title}</h1><p class="intro">${S.intro}</p><span class="stamp">${S.through} ${date(D.end)}</span></header>
 <div class="controls">${control('scenario',S.scenario,`<select id="scenario">${Object.entries(S.scenarios).map(([k,v])=>option(k,v)).join('')}</select>`)}
 ${control('horizon',S.horizon,'<select id="horizon"></select>')}
 ${control('amount',S.amount,'<input id="amount" type="number" min="1" max="1000000" value="1500" step="50"><small id="euro-equivalent"></small>')}
 ${control('unit',S.unit,`<select id="unit">${Object.entries(S.units).map(([k,v])=>option(k,v)).join('')}</select>`)}
 <label class="check"><input id="real" type="checkbox" checked>${S.real}</label></div>
 <section class="panel"><div class="section-head"><h2>${S.compare}</h2><small id="selection-count"></small></div><p class="muted">${S.limit}</p><div class="choices" id="choices"></div><div id="custom"></div><p class="muted">${S.baseline}</p></section>
 <div class="notice">${S.estimates}</div><div id="error" class="error" role="alert"></div><div id="results"></div>
 <footer><h2>${S.dataNotes}</h2><p>${S.tax}</p><p>${S.inflation}</p><p>${S.bucket}</p><p>${S.rules}</p><p>${S.proxies}</p><p>${S.popular}</p><p><a href="README.md">${S.review}</a> · <a href="data/approximations.json">${S.raw}</a></p><strong>${S.past}</strong></footer>`;
 const $=id=>document.getElementById(id);
 function names(){return Object.fromEntries(Object.entries(D.assets).map(([k,v])=>[k,v.name]));}
 function weightsText(p){const n=names();return Object.entries(p.weights).map(([k,w])=>`${(100*w).toFixed(w*100%1?1:0)}% ${n[k]}`).join(' · ');}
 function currentPortfolios(){const available=P.availablePresets(D,start);return selected.map(id=>id==='custom'?{id,name:S.custom,kind:'custom',weights:Object.fromEntries(Object.entries(custom).filter(([,v])=>v>0).map(([k,v])=>[k,v/100]))}:available.find(p=>p.id===id)).filter(Boolean);}
 function renderChoices(){
  const available=P.availablePresets(D,start);
  selected=selected.filter(id=>id==='custom'||available.some(p=>p.id===id));
  const options=[...available,{id:'custom',name:S.custom,kind:'custom',source:S.customSource}];
  $('choices').innerHTML=options.map(p=>`<div class="choice"><label><input type="checkbox" data-preset="${p.id}" ${selected.includes(p.id)?'checked':''}>${esc(p.name)}</label><span class="tag ${p.kind}">${p.isFund?'Advice \u00b7 one fund':S.kinds[p.kind]}</span><small>${p.url?`<a href="${esc(p.url)}" target="_blank" rel="noreferrer">${esc(p.source)}</a>`:esc(p.source)} ${p.year||''}</small>${p.weights?`<small>${esc(weightsText(p))}${p.description?`<br>${esc(p.description)}`:""}</small>`:''}</div>`).join('');
  $('selection-count').textContent=S.selected(selected.length);
  $('choices').querySelectorAll('input').forEach(c=>c.disabled=!c.checked&&selected.length>=4);
  renderCustom();
 }
 function resetCustom(){custom=Object.fromEntries(P.availableAssets(D,start).map(k=>[k,k==='us_stocks'?100:0]));}
 function renderCustom(){
  $('custom').innerHTML=selected.includes('custom')?`<details open><summary>${S.custom} · <span id="custom-total">${S.customTotal(100)}</span></summary><p class="muted">${S.customHint}</p><div class="custom-grid">${Object.entries(custom).map(([k,v])=>`<label for="weight-${k}">${esc(D.assets[k].name)} <output id="out-${k}">${v}%</output><input id="weight-${k}" data-weight="${k}" type="range" min="0" max="100" step="1" value="${v}"></label>`).join('')}</div></details>`:'';
 }
 function redistribute(key,value){
  const others=Object.keys(custom).filter(k=>k!==key),remaining=100-value,total=others.reduce((v,k)=>v+custom[k],0);
  const parts=others.map(k=>({k,x:remaining*(total?custom[k]/total:1/others.length)}));
  custom[key]=value;parts.forEach(p=>custom[p.k]=Math.floor(p.x));
  let left=remaining-parts.reduce((s,p)=>s+custom[p.k],0);
  parts.sort((a,b)=>(b.x-Math.floor(b.x))-(a.x-Math.floor(a.x)));
  for(let i=0;i<left;i++)custom[parts[i].k]++;
  for(const [k,v] of Object.entries(custom)){if($('weight-'+k)){$('weight-'+k).value=v;$('out-'+k).textContent=v+'%';}}
 }
 function horizons(){const old=$('horizon').value;$('horizon').innerHTML=option('latest',S.latest)+[3,5,10,15,20].filter(y=>E.addMonths(start,y*12)<=D.end).map(y=>option(y,S.years(y))).join('');if([...$('horizon').options].some(o=>o.value===old))$('horizon').value=old;}
 function money(v){const unit=$('unit').value;return `${unit==='usd'?'$':unit==='eur'?'€':''}${fmt(v)}${unit==='bucket'?' '+S.unitNames.bucket:''}`;}
 function chart(){
  const rows=runs[0].sim.rows,W=Math.max(280,Math.min(1050,app.clientWidth-52)),H=W<600?320:390,L=W<600?58:82,R=20,T=15,B=42,n=rows.length;
  chartWidth=W;
  const max=Math.max(...runs.flatMap(r=>r.sim.rows.map(x=>x.displayValue)),...rows.map(r=>r.displayIn))*1.08;
  const x=i=>L+i*(W-L-R)/Math.max(1,n-1),y=v=>H-B-v/max*(H-T-B);
  let paths='';
  for(let j=0;j<=4;j++){const value=max*j/4;paths+=`<line class="grid" x1="${L}" x2="${W-R}" y1="${y(value)}" y2="${y(value)}"/><text text-anchor="end" x="${L-10}" y="${y(value)+4}">${new Intl.NumberFormat('en-GB',{notation:'compact',maximumFractionDigits:1}).format(value)}</text>`;}
  const ticks=W<600?2:4;
  for(let j=0;j<=ticks;j++){const i=Math.round((n-1)*j/ticks);paths+=`<text text-anchor="middle" x="${x(i)}" y="${H-12}">${W<600?rows[i].month.slice(0,4):rows[i].month}</text>`;}
  runs.forEach((r,j)=>{const path=r.sim.rows.map((v,i)=>`${i?'L':'M'}${x(i)},${y(v.displayValue)}`).join(' ');const wi=r.sim.rows.indexOf(r.sim.worst);paths+=`<path class="curve" stroke="${colors[j]}" d="${path}"/><circle cx="${x(wi)}" cy="${y(r.sim.worst.displayValue)}" r="6" fill="${colors[j]}" stroke="#fff" stroke-width="2" data-worst="${r.p.id}" role="button" tabindex="0" aria-label="${esc(S.inspectWorst(r.p.name,date(r.sim.worst.month)))}"/>`;});
  let paid=`M${x(0)},${y(rows[0].displayIn)}`;rows.slice(1).forEach((r,j)=>paid+=` H${x(j+1)} V${y(r.displayIn)}`);
  return `<section class="panel"><h2>${S.path}</h2><p class="muted">${S.chartNote}</p><div class="legend">${runs.map((r,j)=>`<span style="--color:${colors[j]}">${esc(r.p.name)}</span>`).join('')}<span style="--color:#333">${S.moneyIn}</span></div><svg id="chart" class="chart" viewBox="0 0 ${W} ${H}" role="img" tabindex="0" aria-label="${S.chartLabel}">${paths}<path class="curve" stroke="#333" stroke-dasharray="5 5" d="${paid}"/><line id="cursor" x1="${L}" x2="${L}" y1="${T}" y2="${H-B}" stroke="#a0aba1"/></svg><div id="hover" class="hover" aria-live="polite">${S.inspect}</div><small>${S.units[$('unit').value]} · ${$('real').checked?S.real:S.dated}</small></section>`;
 }
 function table(){return `<section class="panel"><h2>${S.checkpoints}</h2><p class="muted">${S.checkpointsNote}</p><div class="scroll"><table><thead><tr><th>${S.portfolio}</th>${[3,5,10,15,20].map(y=>`<th>${S.years(y)}</th>`).join('')}<th>${S.end}</th></tr></thead><tbody>${runs.map(r=>`<tr><th scope="row">${esc(r.p.name)}</th>${[3,5,10,15,20,'end'].map(y=>{const c=y==='end'?r.sim.final:r.sim.checkpoints[y];return c?`<td class="${c.afterTaxBelowMoneyIn?'loss':''}">${money(c.displayAfterTax)}<small>${mult(c.multiple)}</small></td>`:`<td>${S.unavailable}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div></section>`;}
 function cards(){
  return `<section><h2>${S.stories}</h2><div class="cards">${runs.map((r,i)=>{
   const s=r.sim,w=s.worst,f=s.final;
   return `<article class="card" style="--color:${colors[i]}"><h3>${esc(r.p.name)}</h3>
    <div class="metric ${f.afterTaxBelowMoneyIn?'loss':''}">${mult(f.multiple)}</div>
    <small>${S.after}${f.afterTaxBelowMoneyIn?' · '+S.loss:''}</small>
    <p>${S.final(date(f.month),money(f.displayAfterTax),money(f.displayIn))}</p>
    <div class="gut ${w.belowMoneyIn?'loss':''}"><h4>${S.worstMoment} · ${date(w.month)}</h4>
     <p>${S.worst(date(w.month),money(w.displayIn),money(w.displayAfterTax))}</p>
     <strong>${S.gut}</strong><button type="button" data-worst="${r.p.id}">${S.showWorst}</button>
    </div>
    <p>${s.underwater?(s.recovery?S.recovered(date(s.recovery)):S.unrecovered):S.never}</p>
    <p class="muted">${S.drop((100*s.drawdown.fraction).toFixed(1)+'%',date(s.drawdown.peak),date(s.drawdown.trough))} ${S.underwater(s.underwater,s.longest)}</p>
   </article>`;
  }).join('')}</div></section>`;
 }
 function rangePanel(){return `<section class="panel"><div class="section-head"><h2>${S.rangeTitle}</h2><label>${S.horizon}<select id="range-horizon">${[3,5,10,15,20].map(y=>option(y,S.years(y))).join('')}</select></label></div><p class="muted">${S.rangeNote}</p><div id="ranges"></div></section>`;}
 function renderRanges(){const years=$('range-horizon').value;const available=runs.filter(r=>['baseline','advice','fund'].includes(r.p.kind));const items=available.map(r=>({p:r.p,r:globalThis.MAMA_RANGES.variants[`${$('unit').value}:${$('real').checked?'real':'nominal'}`][r.p.id][years]}));const max=Math.max(1,...items.map(x=>x.r.best?.multiple||0));$('ranges').innerHTML=items.map(({p,r})=>`<div class="range-row"><strong>${esc(p.name)}</strong>${r.count<12?`<p>${S.notEnough(r.count)}</p>`:`<div class="range-track"><span class="range-band" style="left:${r.worst.multiple/max*100}%;width:${(r.best.multiple-r.worst.multiple)/max*100}%"></span><span class="range-dot" style="left:${r.median/max*100}%"></span></div><div class="range-labels"><span class="${r.worst.multiple<1?'loss':''}">${S.worstLabel} ${mult(r.worst.multiple)}<br>${date(r.worst.start)}</span><span class="${r.median<1?'loss':''}">${S.medianLabel} ${mult(r.median)}</span><span class="${r.best.multiple<1?'loss':''}">${S.bestLabel} ${mult(r.best.multiple)}<br>${date(r.best.start)}</span></div><small>${S.windows(r.count)}</small>`}</div>`).join('');}
 function inspect(i){
  const rows=runs[0].sim.rows;
  inspectIndex=Math.max(0,Math.min(rows.length-1,i));
  const row=rows[inspectIndex],left=chartWidth<600?58:82;
  const x=left+inspectIndex*(chartWidth-left-20)/Math.max(1,rows.length-1);
  $('cursor').setAttribute('x1',x);$('cursor').setAttribute('x2',x);
  const worstNames=runs.filter(r=>r.sim.worst.month===row.month).map(r=>esc(r.p.name));
  $('hover').innerHTML=`<strong>${date(row.month)}</strong> · ${S.moneyIn}: ${money(row.displayIn)}<br>${runs.map(r=>`${esc(r.p.name)}: ${money(r.sim.rows[inspectIndex].displayValue)}`).join(' · ')}${worstNames.length?`<p class="gut">${S.chartGut(worstNames.join(', '))}</p>`:''}`;
 }
 function render(){
  const contribution=Number($('amount').value);if(!Number.isFinite(contribution)||contribution<1||contribution>1000000){$('error').textContent=S.amountError;$('results').innerHTML='';return;}
  $('error').textContent='';
  $('euro-equivalent').textContent='About €'+fmt(contribution/D.macro.eurusd[D.end])+' at the latest exchange rate';
  const end=$('horizon').value==='latest'?D.end:E.addMonths(start,Number($('horizon').value)*12);
  try{runs=[P.baseline,...currentPortfolios()].map(p=>({p,sim:E.simulate(D,{start,end,weights:p.weights,contribution,unit:$('unit').value,real:$('real').checked})}));}
  catch(e){$('error').textContent=S.errors+' '+e.message;return;}
  const previous=$('range-horizon')?.value||'10';
  $('results').innerHTML=chart()+table()+cards()+rangePanel();$('range-horizon').value=previous;renderRanges();
  $('range-horizon').addEventListener('change',renderRanges);
  globalThis.MAMA_PROPERTY_SELECTION={start,portfolios:currentPortfolios()};
  window.dispatchEvent(new Event('mama:selection'));
  $('chart').addEventListener('pointermove',e=>{const rect=e.currentTarget.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*chartWidth,left=chartWidth<600?58:82;inspect(Math.round((x-left)/(chartWidth-left-20)*(runs[0].sim.rows.length-1)));});
  $('chart').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();inspect(e.key==='Home'?0:e.key==='End'?runs[0].sim.rows.length-1:inspectIndex+(e.key==='ArrowRight'?1:-1));}});
 }
 function showWorst(id){
  const r=runs.find(r=>r.p.id===id);if(!r)return;
  inspect(r.sim.rows.indexOf(r.sim.worst));
  $('chart').scrollIntoView({block:'center',behavior:'instant'});
  $('chart').focus({preventScroll:true});
 }
 $('results').addEventListener('click',e=>{const target=e.target.closest('[data-worst]');if(target)showWorst(target.dataset.worst);});
 $('results').addEventListener('keydown',e=>{if(e.target.matches('circle[data-worst]')&&['Enter',' '].includes(e.key)){e.preventDefault();showWorst(e.target.dataset.worst);}});
 let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(render,150);});
 $('scenario').addEventListener('change',()=>{start=$('scenario').value;selected=[...defaults[start]];resetCustom();horizons();renderChoices();render();});
 for(const id of ['horizon','amount','unit','real'])$(id).addEventListener('change',render);
 $('choices').addEventListener('change',e=>{const id=e.target.dataset.preset;if(!id)return;selected=e.target.checked?[...selected,id]:selected.filter(k=>k!==id);renderChoices();render();});
 $('custom').addEventListener('input',e=>{const key=e.target.dataset.weight;if(key){redistribute(key,Number(e.target.value));render();}});
 resetCustom();horizons();renderChoices();render();
})();
