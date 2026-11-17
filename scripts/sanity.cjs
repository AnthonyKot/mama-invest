const fs=require('node:fs'),E=require('../src/engine.js');
const d=JSON.parse(fs.readFileSync('data/series.json','utf8'));
const us=E.simulate(d,{start:'1999-01',weights:{us_stocks:1},unit:'usd',real:false});
let ok=true;
for(const prefix of ['2003','2009']){
 const rows=us.rows.filter(r=>r.month.startsWith(prefix)&&r.month.slice(5)<='04');
 const worst=rows.reduce((a,b)=>a.ratio<b.ratio?a:b);
 const pass=worst.value<worst.invested;ok&&=pass;
 console.log(`${pass?'PASS':'FAIL'} US stocks ${worst.month}: nominal value $${worst.value.toFixed(2)}, money in $${worst.invested.toFixed(2)}`);
}
const btc=d.assets.btc.values, start=btc['2017-12'];
const drop=1-Math.min(...E.months('2018-01','2018-12').map(m=>btc[m]))/start;
ok&&=drop>.7;
console.log(`${drop>.7?'PASS':'FAIL'} Bitcoin Dec 2017 purchase: ${(drop*100).toFixed(2)}% loss by a month-end in 2018 (single purchase, no contributions).`);
console.log(`CPI estimate October 2025: ${d.macro.us_cpi['2025-10'].toFixed(6)}. UK rate proxy: 3.75% Feb–Oct 2026.`);
process.exitCode=ok?0:1;
