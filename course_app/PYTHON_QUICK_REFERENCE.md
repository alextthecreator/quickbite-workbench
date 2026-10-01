# Python quick reference for M10

- Functions: `def name(arg): ...`
- Raise contract errors: `raise ValueError("message")`
- Unit assertion: `self.assertEqual(actual, expected)`
- Boolean assertion: `self.assertTrue(x)` / `self.assertFalse(x)`
- Exception assertion: `with self.assertRaises(ValueError): ...`
- Run: `python -m unittest tests.test_m10 tests.test_student -v`
