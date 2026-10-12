import unittest
from app.tools import calculate, audit


class ToolsTest(unittest.TestCase):
    def test_pricing_covers_fee(self):
        result = calculate("pricing", dict(income=900, costs=100, hours=100, fee=20))
        self.assertEqual(result["Hourly rate"], 12.5)

    def test_invalid_fee(self):
        with self.assertRaises(ValueError):
            calculate("pricing", dict(income=1, costs=0, hours=1, fee=100))

    def test_weighted_gpa(self):
        result = calculate("gpa", dict(scale=4, courses=[dict(grade=4, credits=3), dict(grade=2, credits=1)]))
        self.assertEqual(result["GPA"], 3.5)

    def test_nonfinite_and_zero_rejected(self):
        for data in [dict(earned=1, total=0), dict(earned=float("nan"), total=100)]:
            with self.assertRaises(ValueError):
                calculate("percentage", data)

    def test_completeness_is_explicit(self):
        result = audit(dict(platform="LinkedIn", headline="Engineer"))
        self.assertEqual(result["Completeness score"], 20)
        self.assertEqual(len(result["Recommended next steps"]), 4)

    def test_no_fake_platform(self):
        with self.assertRaises(ValueError):
            audit(dict(platform="Unknown", headline="Hello"))


if __name__ == "__main__":
    unittest.main()
