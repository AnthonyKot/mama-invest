/* One home, one amortising mortgage; no slices and no invented observations. */
(function(root){
 'use strict';
 const E=typeof module!=='undefined'?require('./engine.js'):root.MamaEngine;
 const cents=x=>Math.round((x+Number.EPSILON)*100)/100;
 const valid=(x,name,min=0,max=Infinity)=>{if(!Number.isFinite(x)||x<min||x>max)throw Error('Invalid '+name);return x;};
 function annuity(principal,annualRate,n=240){
  valid(principal,'principal');valid(annualRate,'mortgage rate',0,1);
  if(!Number.isInteger(n)||n<1)throw Error('Invalid mortgage term');
  const r=annualRate/12;return r?principal*r/-Math.expm1(-n*Math.log1p(r)):principal/n;
 }
 function annualReturn(payments,final,end){
  if(!Number.isFinite(final)||final<=0)return null;
  const flows=payments.filter(p=>p.amount>0).map(p=>({amount:p.amount,t:(E.monthNumber(end)-E.monthNumber(p.month))/12}));
  if(!flows.length||flows.some(p=>p.t<0)||!flows.some(p=>p.t>0))return null;
  const fv=log=>flows.reduce((s,p)=>s+p.amount*Math.exp(log*p.t),0);
  let lo=-64,hi=1;
  if(fv(lo)>=final)return null; // No finite meaningful rate when the terminal payment consumes proceeds.
  while(fv(hi)<final&&hi<64)hi*=2;
  if(fv(hi)<final)return null;
  for(let i=0;i<180;i++){const mid=(lo+hi)/2;if(fv(mid)>final)hi=mid;else lo=mid;}
  return Math.expm1((lo+hi)/2);
 }
 function ruleFor(rules,year){
  const rule=rules[year];if(!rule)throw Error('Missing property tax rule for '+year);return rule;
 }
 function rentalTax(rule,gross,cost,interest){
  const base=rule.rentOnGross?gross:Math.max(0,gross-cost-(rule.deductInterest?interest:0));
  return Math.max(0,base*(rule.rentRate||0)-interest*(rule.interestCredit||0));
 }
 function wealthTax(rule,{value,debt,savings=0,annualRent=0}){
  let factor=1;
  if(rule.rentalDiscount){const yieldPercent=value?annualRent/value*100:0;
   factor=rule.rentalDiscount.find(b=>yieldPercent<=b.upTo)?.factor??1;}
  const taxableValue=value*factor,allowedDebt=Math.max(0,debt-(rule.debtThreshold||0));
  if(rule.mode==='split')return Math.max(0,(taxableValue*rule.assetReturn+savings*(rule.cashReturn||0)-allowedDebt*rule.debtReturn)*rule.rate);
  if(rule.mode==='bands'){
   let base=Math.max(0,taxableValue+savings-allowedDebt),tax=0,previous=0;
   for(const band of rule.bands){const slice=Math.min(base,band.upTo-previous);tax+=Math.max(0,slice)*band.return*rule.rate;base-=slice;previous=band.upTo;if(base<=0)break;}
   return tax;
  }
  return Math.max(0,taxableValue+savings-allowedDebt)*(rule.wealthRate||0);
 }
 function saleTax(rule,{value,price,purchaseCosts,sellingCosts,months}){
  if(rule.exemptAfterMonths!==undefined&&months>=rule.exemptAfterMonths)return 0;
  return Math.max(0,value-sellingCosts-price-(rule.deductPurchaseCosts?purchaseCosts:0)-(rule.saleAllowance||0))*(rule.saleRate||0);
 }
 function simulate(data,country,{start,end,deposit=.2,purchaseCost,sellingCost=.02,costShare=.35,maintenanceRate=0,unit='eur',taxOverrides={},mortgageRate,allowPostTerm=false}={}){
  if(!country.cases[start])throw Error('Property unavailable at purchase date');
  const setup=country.cases[start],term=240,target=E.addMonths(start,term);
  end=end||[target,country.end,data.end].sort()[0];
  if((end>target&&!allowPostTerm)||end>country.end||end>data.end||end<start)throw Error('Outside property coverage');
  valid(deposit,'deposit',0,.4);valid(sellingCost,'selling cost',0,1);valid(costShare,'cost share',0,1);
  valid(maintenanceRate,'annual maintenance rate',0,1);
  const price=valid(setup.price,'purchase price',.01);
  const rate=valid(mortgageRate??setup.rate,'mortgage rate',0,1);
  const purchaseRate=valid(purchaseCost??setup.purchaseCost,'purchase costs',0,1);
  const purchaseCosts=cents(price*purchaseRate),initialLoan=cents(price*(1-deposit));
  const upfront=cents(price-initialLoan+purchaseCosts),payment=cents(annuity(initialLoan,rate));
  const source=(series,month)=>{const x=series[month];if(!Number.isFinite(x))throw Error('Missing property observation '+month);return x;};
  const fx=month=>valid(source(country.usdPerLocal,month),'local FX',Number.MIN_VALUE);
  const display=(amount,month)=>E.transform(amount*fx(month),month,start,data,unit,true);
  const ruleAt=year=>({...ruleFor(country.taxRules,year),...taxOverrides,...(taxOverrides[year]||{})});
  const rows=[],contributions={},displayPayments=[];
  let loan=initialLoan,savings=0,displayIn=0,usdIn=0,localIn=0,negativeEquityMonths=0;
  const totals={grossRent:0,runningCosts:0,maintenance:0,otherCosts:0,rentTax:0,annualTax:0,interest:0,savingsInterest:0,purchaseCosts,principal:0};
  const shown=Object.fromEntries(Object.keys(totals).map(k=>[k,0]));shown.purchaseCosts=display(purchaseCosts,start);
  let yearState=null;
  for(const [i,month] of E.months(start,end).entries()){
   const year=Number(month.slice(0,4)),rule=ruleAt(year),value=price*source(country.priceIndex,month)/source(country.priceIndex,start);
   const annualRent=price*setup.grossYield*source(country.rentIndex,month)/source(country.rentIndex,start);
   if(!yearState||yearState.year!==year){
    const lagMonth=rule.valuationLag?`${year-rule.valuationLag}-01`:month;
    const taxValue=country.priceIndex[lagMonth]!==undefined?price*country.priceIndex[lagMonth]/country.priceIndex[start]:value;
    yearState={year,charge:wealthTax(rule,{value:taxValue,debt:loan,savings,annualRent}),months:0};
   }
   let grossRent=0,runningCosts=0,maintenance=0,otherCosts=0,rentTax=0,annualTax=0,interest=0,principal=0,paidPayment=0,savingsInterest=0,outOfPocket=0,rentKept=0;
   if(i){
    interest=cents(loan*rate/12);paidPayment=i===term?cents(loan+interest):Math.min(payment,cents(loan+interest));
    principal=cents(paidPayment-interest);loan=cents(Math.max(0,loan-principal));
    grossRent=cents(annualRent/12);
    maintenance=cents(value*maintenanceRate/12);otherCosts=cents(grossRent*costShare);
    runningCosts=cents(maintenance+otherCosts);
    rentTax=cents(rentalTax(rule,grossRent,runningCosts,interest));
    yearState.months++;
    // Annual charge settles in December, or accrues through the final sale month.
    if(month.endsWith('-12')||month===end){
     const charge=rule.averageBase?(yearState.charge+wealthTax(rule,{value,debt:loan,savings,annualRent}))/2:yearState.charge;
     annualTax=cents(charge*yearState.months/12);
    }
    const depositRate=source(country.depositRate,E.addMonths(month,-1));
    savingsInterest=cents(savings*depositRate/12*(1-(rule.savingsIncomeRate||0)));
    savings=cents(savings+savingsInterest);
    rentKept=cents(grossRent-runningCosts-rentTax-annualTax);
    const gap=cents(paidPayment-rentKept);outOfPocket=Math.max(0,gap);
    if(gap<0)savings=cents(savings-gap);
   }
   const paidLocal=i?outOfPocket:upfront,paidUSD=cents(paidLocal*fx(month));
   contributions[month]=paidUSD;usdIn+=paidUSD;localIn+=paidLocal;
   const displayedPaid=E.transform(paidUSD,month,start,data,unit,true);
   displayIn+=displayedPaid;if(paidUSD>0)displayPayments.push({month,amount:displayedPaid});
   for(const [k,v] of Object.entries({grossRent,runningCosts,maintenance,otherCosts,rentTax,annualTax,interest,savingsInterest,principal})){
    totals[k]+=v;shown[k]+=display(v,month);
   }
   let saleBasis=price;
   if(rule.saleRebase&&start<rule.saleRebase&&month>=rule.saleRebase){
    saleBasis=Math.max(price,price*source(country.priceIndex,rule.saleRebase)/source(country.priceIndex,start));
   }
   const sellingCosts=value*sellingCost,tax=saleTax(rule,{value,price:saleBasis,purchaseCosts:saleBasis===price?purchaseCosts:0,sellingCosts,months:i});
   const equity=value-loan,netEquity=equity-sellingCosts,proceeds=netEquity-tax+savings;
   if(equity<0)negativeEquityMonths++;
   rows.push({month,value,loan,equity,netEquity,savings,sellingCosts,saleTax:tax,proceeds,paidLocal,paidUSD,
    mortgagePayment:paidPayment,grossRent,rentKept,runningCosts,maintenance,otherCosts,rentTax,annualTax,interest,principal,outOfPocket,
    displayValue:display(proceeds,month),displayEquity:display(equity,month),displayWorstWorth:display(netEquity,month),
    displayIn,displayOutOfPocket:display(outOfPocket,month),displayMortgage:display(paidPayment,month),displayRent:display(rentKept,month),
    multiple:displayIn?display(proceeds,month)/displayIn:null,worstRatio:displayIn?display(netEquity,month)/displayIn:null});
  }
  const final=rows.at(-1),operating=rows.slice(1),funded=rows.filter(r=>r.displayIn>0);
  const worst=funded.length?funded.reduce((a,b)=>b.worstRatio<a.worstRatio?b:a):null;
  const lowestEquity=rows.reduce((a,b)=>b.equity<a.equity?b:a);
  const highest=operating.length?operating.reduce((a,b)=>b.displayOutOfPocket>a.displayOutOfPocket?b:a):null;
  const average=(list,key)=>list.length?list.reduce((s,r)=>s+r[key],0)/list.length:0;
  const firstCovered=operating.find(r=>r.rentKept>=r.mortgagePayment)?.month||null;
  const coveredFrom=operating.find((r,i)=>operating.slice(i).every(x=>x.rentKept>=x.mortgagePayment))?.month||null;
  return {start,end,target,finished:end>=target,elapsedMonths:rows.length-1,price,rate,maintenanceRate,costShare,upfront,purchaseCosts,payment,initialLoan,
   rows,final,contributions,displayPayments,usdIn,localIn,negativeEquityMonths,worst,lowestEquity,highest,firstCovered,coveredFrom,
   firstYear:average(operating.slice(0,12),'displayOutOfPocket'),firstYearLocal:average(operating.slice(0,12),'outOfPocket'),
   average:average(operating,'displayOutOfPocket'),averageLocal:average(operating,'outOfPocket'),
   annualReturn:annualReturn(displayPayments,final.displayValue,end),totals,shown,
   priceGrowth:final.value-price,displayPriceGrowth:display(final.value,end)-display(price,start),
   displayUpfront:E.transform(contributions[start],start,start,data,unit,true),unit};
 }
 function residentPortfolioTax(country,{gainRate,allowance}={}){
  const dutch=country.currency==='EUR',uk=country.currency==='GBP';
  let basis=0;
  return {
   annualCharge({month,i,value}){
    if(!dutch||!i)return 0;
    // Monthly accrual approximation: no rental valuation discount on securities.
    const rule={...ruleFor(country.taxRules,Number(month.slice(0,4)))};
    delete rule.rentalDiscount;
    return wealthTax(rule,{value:value/country.usdPerLocal[month],debt:0})*country.usdPerLocal[month]/12;
   },
   saleTax({month,value,paid}){
    const fx=country.usdPerLocal[month];basis+=paid/fx;
    return dutch?0:Math.max(0,value/fx-basis-(allowance??(uk?3000:0)))*(gainRate??(uk?.24:.15))*fx;
   }
  };
 }
 function compare(data,property,weights,{country,gainRate,allowance}={}){
  const taxPolicy=country?residentPortfolioTax(country,{gainRate,allowance}):null;
  const investor=E.simulate(data,{start:property.start,end:property.end,weights,contributions:property.contributions,unit:property.unit,real:true,taxPolicy});
  const payments=investor.payments.map(p=>({month:p.month,amount:E.transform(p.amount,p.month,property.start,data,property.unit,true)}));
  return {investor,annualReturn:annualReturn(payments,investor.final.displayAfterTax,property.end),
   margin:investor.final.displayAfterTax>0?property.final.displayValue/investor.final.displayAfterTax:null};
 }
 const api={annuity,annualReturn,wealthTax,rentalTax,saleTax,ruleFor,simulate,compare,residentPortfolioTax};
 root.MamaProperty=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
