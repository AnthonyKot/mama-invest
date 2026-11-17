import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('assembler', Path(__file__).resolve().parents[1] / 'scripts/assemble_data.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class ApproximationTests(unittest.TestCase):
    def test_geometric_mean_and_raw_unchanged(self):
        raw = {'2025-09': 100, '2025-11': 121}
        values, changes = m.patch_cpi(raw)
        self.assertEqual(values['2025-10'], 110)
        self.assertNotIn('2025-10', raw)
        self.assertEqual(len(changes), 1)
    def test_observed_value_wins(self):
        self.assertEqual(m.patch_cpi({'2025-10': 111})[1], [])
    def test_missing_neighbours_fail(self):
        with self.assertRaises(KeyError): m.patch_cpi({'2025-09': 100})
        with self.assertRaises(ValueError): m.patch_cpi({'2025-09': -1, '2025-11': 100})
    def test_other_gaps_not_filled(self):
        values, _ = m.patch_cpi({'2025-09': 100, '2025-11': 121})
        with self.assertRaisesRegex(ValueError, 'Unapproved missing'): m.validate(values)
    def test_uk_proxy_is_bounded_and_preserves_observations(self):
        values, changes = m.patch_uk_rate({'2026-01': 3.71, '2026-03': 4})
        self.assertEqual(values['2026-02'], 3.75)
        self.assertEqual(values['2026-03'], 4)
        self.assertNotIn('2026-11', values)
        self.assertEqual(len(changes), 8)

if __name__ == '__main__': unittest.main()
