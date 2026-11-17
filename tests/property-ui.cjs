const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
test('upkeep controls recalculate matched results and combined mode restores original costs',()=>{
 const handlers={},host={innerHTML:'',addEventListener:(name,fn)=>handlers[name]=fn};
 const D=require('../data/series.json'),Q=require('../data/property.json');
 const H=require('../src/property-engine.js');
 const context={MAMA_DATA:D,MAMA_PROPERTY_DATA:Q,MamaProperty:H,
  MamaEngine:require('../src/engine.js'),MamaPortfolios:require('../src/portfolios.js'),
  MamaPropertyForecast:require('../src/property-forecast.js'),MAMA_PROPERTY_FORECAST:require('../data/property-forecast.js'),
  structuredClone,document:{createElement:()=>host,querySelector:()=>({before:()=>{}})},
  window:{addEventListener:()=>{}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/property-app.js'),'utf8'),context);
 const checkScenarioLabels=()=>{
  const panel=host.innerHTML.split('class="panel forecast-panel"')[1].split('<details open>')[0];
  for(const scenario of context.MAMA_PROPERTY_FORECAST.scenarios){
   for(const country of Object.values(Q.countries)){
    assert.ok(panel.includes(`<th scope="row">${scenario.name}<small>${country.name} resident</small>`));
   }
  }
  assert.ok(!host.innerHTML.includes('undefined'));
 };
 checkScenarioLabels();
 const expected=(options)=>Math.round(H.simulate(D,Q.countries.uk,{start:'1999-01',...options}).final.displayIn).toLocaleString('en-GB');
 assert.ok(host.innerHTML.includes(expected({costShare:.2,maintenanceRate:.01})));
 assert.ok(host.innerHTML.includes('Later top-ups:'));
 const change=(key,value)=>handlers.change({target:{dataset:{setting:key},value,checkValidity:()=>true}});
 change('maintenanceRate','2');
 assert.ok(host.innerHTML.includes(expected({costShare:.2,maintenanceRate:.02})));
 change('costMode','combined');
 assert.ok(host.innerHTML.includes(expected({costShare:.35,maintenanceRate:0})));
 assert.ok(!host.innerHTML.includes('data-setting="maintenanceRate"'));
 assert.ok(!host.innerHTML.includes('class="error"'));
 change('forecastStart','2006-07');change('forecastEnd','term');change('forecastMix','6040');
 assert.ok(host.innerHTML.includes('Sale date: <strong>Jul 2026</strong>'));
 assert.ok(host.innerHTML.includes('Classic 60/40 after model tax'));
 checkScenarioLabels();
 assert.ok(host.innerHTML.includes('Purchase-price level estimated'));
 assert.ok(host.innerHTML.includes('Severe stress'));
 assert.ok(!host.innerHTML.includes('NaN'));
 const horizon=()=>host.innerHTML.slice(host.innerHTML.indexOf('id="property-horizons"'));
 assert.ok(horizon().includes('Not reached'));
 assert.ok(!horizon().includes('Includes estimates'));
 change('horizonStart','1999-01');
 assert.ok(horizon().includes('20 years'));
 assert.ok(!horizon().includes('Not reached'));
 const expectedHome=H.simulate(D,Q.countries.nl,{start:'1999-01',end:'2002-01',costShare:.35}).final.displayValue;
 assert.ok(horizon().includes(Math.round(expectedHome).toLocaleString('en-GB')));
 change('horizonStart','2007-07');change('horizonMode','severe');change('horizonEnd','2028-12');
 assert.ok(horizon().includes('Includes estimates'));
 assert.ok(horizon().includes('Dec 2028'));
 assert.ok(!horizon().includes('Not reached'));
 change('unit','usd');
 assert.ok(horizon().includes('$'));
 assert.ok(!host.innerHTML.includes('NaN'));
});
