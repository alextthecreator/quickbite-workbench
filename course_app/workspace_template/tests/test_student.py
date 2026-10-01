import unittest
from student_code import policies

class StudentTests(unittest.TestCase):
    # Add at least six independent M10 tests. Keep expected values based on the published contracts.
    def test_example_placeholder(self):
        self.assertEqual(policies.calculate_order_total([10], 5), 15)

if __name__=='__main__': unittest.main()
