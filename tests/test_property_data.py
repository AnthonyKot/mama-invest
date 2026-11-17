import importlib.util
import json
from pathlib import Path
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from assemble_property import interpolate, rental_path
from property_tax import dutch_rules

class PropertyDataTests(unittest.TestCase):
    def test_rent_uses_matching_oecd_indices_and_preserves_yield_anchor(self):
        # OECD prices and price/rent both double: rents must remain flat,
        # even if the independently selected model house price triples.
        price={'1999-01':100,'2000-01':300}
        hpi={'1999-01':50,'2000-01':100}
        ratios={'1999-01':25,'2000-01':50}
        anchor={'month':'2000-01','yield':.05}
        rent,yields=rental_path(price,hpi,ratios,anchor)
        self.assertEqual(rent['1999-01'],rent['2000-01'])
        self.assertAlmostEqual(yields['1999-01'],.15)
        for start in price:
            annual_rent=price[start]*yields[start]*rent[anchor['month']]/rent[start]
            self.assertAlmostEqual(annual_rent/price[anchor['month']],.05)

    def test_quarterly_interpolation_preserves_endpoints(self):
        x=interpolate({'2000-03':100,'2000-06':133.1})
        self.assertEqual(x['2000-03'],100)
        self.assertAlmostEqual(x['2000-04'],110)
        self.assertAlmostEqual(x['2000-05'],121)
        self.assertEqual(x['2000-06'],133.1)
        self.assertNotIn('2000-02',x)
        self.assertNotIn('2000-07',x)
    def test_missing_quarter_not_silently_bridged(self):
        with self.assertRaises(ValueError):interpolate({'2000-03':100,'2000-09':120})
    def test_dutch_regimes_have_sources_and_correct_boundaries(self):
        rules=dutch_rules()
        self.assertEqual(len(rules),28)
        for r in rules.values():self.assertTrue(r['source'].startswith('https://'))
        self.assertEqual(rules['2000']['rentRate'],.5)
        self.assertEqual(rules['2001']['rentRate'],0)
        self.assertEqual(rules['2001']['wealthRate'],.012)
        self.assertNotIn('rentalDiscount',rules['2009'])
        self.assertEqual(rules['2010']['rentalDiscount'][-1]['factor'],.85)
        self.assertEqual(rules['2012']['rentalDiscount'][-2]['factor'],.81)
        self.assertEqual(rules['2013']['rentalDiscount'][-1]['factor'],.78)
        self.assertEqual(rules['2022']['bands'][0]['upTo'],50650)
        self.assertEqual(rules['2023']['mode'],'split')
        self.assertEqual(rules['2024']['rate'],.36)
        self.assertEqual(rules['2025']['cashReturn'],.0137)
    def test_property_dataset_has_no_forecast_and_bounded_yields(self):
        data=json.loads((ROOT/'data/property.json').read_text(encoding='utf-8'))
        for c in data['countries'].values():
            self.assertEqual(max(c['priceIndex']),c['end'])
            self.assertGreaterEqual(c['yieldRange'][0],.02)
            self.assertLessEqual(c['yieldRange'][1],.10)
            for start,case in c['cases'].items():
                self.assertIn(start,c['priceIndex'])
                self.assertGreater(case['price'],0)
        self.assertIn('pl',data['unavailable'])

if __name__=='__main__':unittest.main()
