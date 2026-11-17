/* Pure simulation functions; usable as a file:// script and in Node. */
(function (root) {
  'use strict';
  const monthNumber = m => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) throw Error('Invalid month');
    return Number(m.slice(0, 4)) * 12 + Number(m.slice(5)) - 1;
  };
  function addMonths(m, n) {
    const x = monthNumber(m) + n;
    return `${Math.floor(x / 12)}-${String(x % 12 + 1).padStart(2, '0')}`;
  }
  function months(start, end) {
    const count = monthNumber(end) - monthNumber(start);
    if (count < 0) throw Error('End precedes start');
    return Array.from({length: count + 1}, (_, i) => addMonths(start, i));
  }
  function positive(value, name) {
    if (!Number.isFinite(value) || value <= 0) throw Error(`Missing or invalid ${name}`);
    return value;
  }
  function transform(value, month, start, data, unit = 'eur', real = true) {
    let factor = 1;
    if (unit === 'bucket') factor /= .5 + .5 * positive(data.macro.gbpusd[month], 'GBPUSD') / positive(data.macro.gbpusd[start], 'GBPUSD');
    else if (unit === 'eur') factor /= positive(data.macro.eurusd[month], 'EURUSD');
    else if (unit !== 'usd') throw Error('Unknown display unit');
    if (real) {
      const inflation = unit === 'eur' ? data.macro.euro_hicp : data.macro.us_cpi;
      factor *= positive(inflation?.[data.inflationBaseEnd||data.end], 'latest inflation index') / positive(inflation?.[month], 'inflation index');
    }
    return value * factor;
  }
  function simulate(data, {start, end = data.end, weights, contribution = 1500, contributions = null, interval = 6, taxRate = .23, unit = 'eur', real = true, taxPolicy = null}) {
    positive(contribution, 'contribution');
    if (!Number.isInteger(interval) || interval < 1) throw Error('Invalid interval');
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) throw Error('Invalid tax rate');
    if (!weights || Object.values(weights).some(v => !Number.isFinite(v) || v < 0) || Math.abs(Object.values(weights).reduce((a,b) => a+b, 0) - 1) > 1e-8) throw Error('Weights must sum to one');
    const keys = Object.keys(weights).filter(k => weights[k] > 0);
    if (start < data.start || end > data.end) throw Error('Outside data coverage');
    for (const k of keys) {
      if (!data.assets[k] || data.assets[k].start > start) throw Error(`Asset unavailable at start: ${k}`);
    }
    const timeline = months(start, end), units = Object.fromEntries(keys.map(k => [k, 0]));
    if (contributions !== null) {
      for (const [month, amount] of Object.entries(contributions)) {
        monthNumber(month);
        if (month < start || month > end || !Number.isFinite(amount) || amount < 0) throw Error('Invalid dated contribution');
      }
    }
    const rows = [], payments = [];
    let invested = 0, displayedIn = 0, previous = 0, neutral = 1, peak = 1, peakMonth = start;
    let drawdown = {fraction: 0, peak: start, trough: start}, underwater = 0, run = 0, longest = 0;
    for (const [i, month] of timeline.entries()) {
      const prices = Object.fromEntries(keys.map(k => [k, positive(data.assets[k].values[month], `${k} at ${month}`)]));
      const holdings = Object.fromEntries(keys.map(k => [k, units[k] * prices[k]]));
      let value = Object.values(holdings).reduce((a,b) => a+b, 0);
      const displayFactor = transform(1, month, start, data, unit, real);
      if (i && previous > 0) neutral *= (value * displayFactor) / previous;
      if (neutral > peak) { peak = neutral; peakMonth = month; }
      const drop = 1 - neutral / peak;
      if (drop > drawdown.fraction) drawdown = {fraction: drop, peak: peakMonth, trough: month};
      let paid = 0;
      if (contributions !== null ? (contributions[month] || 0) > 0 : i % interval === 0) {
        paid = contributions !== null ? contributions[month] : contribution * positive(data.macro.us_cpi[month], 'CPI') / positive(data.macro.us_cpi[data.end], 'latest CPI');
        const shortfalls = keys.map(k => Math.max(0, weights[k] * (value + paid) - holdings[k]));
        const total = shortfalls.reduce((a,b) => a+b, 0);
        keys.forEach((k,j) => { units[k] += paid * (total > 0 ? shortfalls[j] / total : weights[k]) / prices[k]; });
        invested += paid;
        displayedIn += transform(paid, month, start, data, unit, real);
        payments.push({month, amount: paid});
        value = keys.reduce((v,k) => v + units[k] * prices[k], 0);
      }
      const annualTax = taxPolicy ? taxPolicy.annualCharge({month,i,value,paid,end}) : 0;
      if(!Number.isFinite(annualTax)||annualTax<0)throw Error('Invalid annual portfolio tax');
      const charged=Math.min(value,annualTax);
      if(charged>0){const keep=(value-charged)/value;keys.forEach(k=>units[k]*=keep);value-=charged;}
      const tax = taxPolicy ? taxPolicy.saleTax({month,value,paid}) : taxRate * Math.max(0, value - invested);
      if(!Number.isFinite(tax)||tax<0)throw Error('Invalid portfolio sale tax');
      const afterTax = value - tax;
      const displayValue = value * displayFactor, displayAfterTax = afterTax * displayFactor;
      const tolerance = Math.max(1, displayedIn) * 1e-10;
      const belowMoneyIn = displayAfterTax < displayedIn - tolerance;
      const afterTaxBelowMoneyIn = displayAfterTax < displayedIn - tolerance;
      if (belowMoneyIn) { underwater++; run++; longest = Math.max(longest, run); } else run = 0;
      rows.push({month, value, afterTax, tax, annualTax:charged, invested, paid, units: {...units}, neutral,
                 nominalMultiple: invested ? afterTax / invested : null, nominalRatio: invested ? value / invested : null,
                 multiple: displayedIn ? displayAfterTax / displayedIn : null, ratio: displayedIn ? displayValue / displayedIn : null,
                 belowMoneyIn, afterTaxBelowMoneyIn, displayValue, displayAfterTax, displayIn: displayedIn});
      previous = displayValue;
    }
    const funded = rows.filter(r => r.displayIn > 0);
    if (!funded.length) throw Error('At least one positive contribution is required');
    const worst = funded.reduce((a,b) => b.multiple < a.multiple ? b : a);
    const recovery = worst.belowMoneyIn ? rows.find(r => r.month > worst.month && !r.belowMoneyIn)?.month || null : worst.month;
    const checkpoints = {};
    for (const years of [3,5,10,15,20]) {
      const row = rows[years * 12];
      if (row) checkpoints[years] = row;
    }
    return {rows, payments, final: rows.at(-1), checkpoints, worst, recovery, drawdown, underwater, longest, unit, real};
  }
  function ranges(data, portfolio, years, options = {}) {
    if (!['advice','baseline','fund'].includes(portfolio.kind)) return null;
    const unit = options.unit ?? 'eur', real = options.real ?? true;
    const displayStart = unit === 'eur' ? Object.keys(data.macro.eurusd).sort()[0] : data.start;
    const first = [data.start, displayStart, portfolio.published, ...Object.keys(portfolio.weights).map(k => data.assets[k]?.start || '9999-12')].sort().at(-1);
    const last = addMonths(data.end, -years * 12);
    if (first > last) return {count: 0};
    const results = months(first, last).map(start => ({start,
      multiple: simulate(data, {...options, start, end: addMonths(start, years*12), weights: portfolio.weights, unit, real}).final.multiple}));
    results.sort((a,b) => a.multiple - b.multiple);
    const count = results.length;
    if (count < 12) return {count};
    const mid = Math.floor(count / 2);
    return {count, worst: results[0], best: results.at(-1), median: count % 2 ? results[mid].multiple : (results[mid-1].multiple + results[mid].multiple)/2};
  }
  const api = {monthNumber, addMonths, months, transform, simulate, ranges};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MamaEngine = api;
})(globalThis);
