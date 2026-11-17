/* Reviewed scenario inputs, 2026-11-16. Forecasts are not observations. */
(function(root){
 const config={
  reviewed:'2026-11-16',lastEnd:'2028-12',
  sources:[
   {name:'ABN AMRO housing outlook',published:'2026-10-01',url:'https://www.abnamro.com/en/news/housing-market-stronger-in-2026-sharper-slowdown-expected-in-2027',note:'NL: 3.8% in 2026 and 2.5% in 2027. Annual-average forecasts used as approximate annual path rates; 2028 repeats 2.5% as our assumption.'},
   {name:'Savills UK housing outlook (property researcher, not a bank)',published:'2026-11-04',url:'https://www.savills.com/insight-and-opinion/savills-news/396416/uk-housing-market-recovery-expected-to-be-delayed-until-2028',note:'UK: 0% in 2026, -1.5% in 2027 and +3.5% in 2028.'},
   {name:'Goldman Sachs US housing outlook',published:'2026-10-30',url:'https://www.goldmansachs.com/insights/articles/the-outlook-for-us-housing-in-2027-amid-rising-mortgage-rates',note:'US: 1.1% December-to-December in 2026 and 0.8% in 2027. 2028 repeats 0.8% as our assumption.'},
   {name:'J.P. Morgan 2027 Long-Term Capital Market Assumptions',published:'2026-10-19',url:'https://am.jpmorgan.com/content/dam/jpm-am-aem/global/en/insights/portfolio-insights/ltcma/noindex/ltcma-2027-report.pdf',note:'USD matrix, page 68: compound returns of 7.5% US large-cap stocks and 5.6% US aggregate bonds. These are 10-15-year assumptions, NOT forecasts for individual years 2027 or 2028. We use them only as illustrative annual reference rates.'}
  ],
  reference:{
   house:{nl:{2026:.038,2027:.025,2028:.025},uk:{2026:0,2027:-.015,2028:.035},us:{2026:.011,2027:.008,2028:.008}},
   stocks:.075,bonds:.056,rent:.02,inflation:.02
  },
  scenarios:[
   {id:'reference',name:'Published outlooks + assumptions',description:'Housing outlooks plus illustrative long-term stock/bond rates; not a consensus forecast.'},
   {id:'downturn',name:'Pessimistic',description:'Our stress test, not a bank forecast or probability estimate.',
    years:{2027:{house:-.10,stocks:-.20,bonds:-.05,rent:-.05,inflation:.04},2028:{house:-.05,stocks:0,bonds:.02,rent:0,inflation:.03}}},
   {id:'severe',name:'Severe stress',description:'Our larger joint property and stock/bond shock; not a worst-case bound.',
    years:{2027:{house:-.20,stocks:-.40,bonds:-.10,rent:-.10,inflation:.05},2028:{house:-.10,stocks:-.10,bonds:0,rent:-.05,inflation:.04}}}
  ]
 };
 root.MAMA_PROPERTY_FORECAST=config;
 if(typeof module!=='undefined')module.exports=config;
})(globalThis);
